import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = neon(neonUrl);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let sales;
    if (from && to) {
      sales = await sql`
        SELECT s.*, p.name as customer_name_joined
        FROM sales s
        LEFT JOIN parties p ON s.party_id = p.id
        WHERE s.date::text >= ${from} AND s.date::text <= ${to + ' 23:59:59'}
        ORDER BY s.id DESC
      `;
    } else {
      sales = await sql`
        SELECT s.*, p.name as customer_name_joined
        FROM sales s
        LEFT JOIN parties p ON s.party_id = p.id
        ORDER BY s.id DESC
      `;
    }

    // Also fetch items for the sales if requested (or we can fetch them individually, but let's send them inline or let them fetch per sale)
    return NextResponse.json(sales);
  } catch (e) {
    console.error('Sales GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch sales: ' + e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = neon(neonUrl);
    const saleData = await req.json();

    const {
      party_id,
      customer_name = '',
      customer_phone = '',
      customer_address = '',
      items = [],
      misc_charges = 0,
      payment_mode = 'Cash',
      tax_mode = 'exclusive',
      paid_amount: paidAmountInput,
      credit_days: creditDaysInput = 0,
      date
    } = saleData;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Sale must have at least one item' }, { status: 400 });
    }

    // 1. Generate Invoice Number
    const profileRows = await sql`SELECT invoice_prefix FROM business_profile WHERE id = 1`;
    const prefix = profileRows[0]?.invoice_prefix || 'INV';
    
    const lastSaleRows = await sql`SELECT invoice_number FROM sales ORDER BY id DESC LIMIT 1`;
    let nextNum = 1;
    if (lastSaleRows.length > 0) {
      const match = lastSaleRows[0].invoice_number.match(/\d+$/);
      nextNum = match ? parseInt(match[0], 10) + 1 : 1;
    }
    const invoiceNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`;

    // 2. Validate inventory and calculate amounts
    let subtotal = 0;
    let totalGst = 0;
    const processedItems = [];

    for (const item of items) {
      const itemQty = Number(item.quantity) || 0;
      const itemPrice = parseFloat(item.price) || 0;
      const gstRate = parseFloat(item.gst_rate) || 0;
      const mrp = parseFloat(item.mrp || item.price) || 0;

      if (itemQty <= 0) {
        return NextResponse.json({ error: `Invalid quantity for ${item.product_name || 'item'}` }, { status: 400 });
      }

      // Check stock availability in database
      if (item.product_id) {
        const stockRows = await sql`SELECT product_name, quantity, cost_price FROM products WHERE id = ${item.product_id}`;
        if (!stockRows.length) {
          return NextResponse.json({ error: `Product not found in database: ${item.product_name}` }, { status: 400 });
        }
        const dbStock = stockRows[0];
        if (Number(dbStock.quantity || 0) < itemQty) {
          return NextResponse.json({ error: `Insufficient stock for ${dbStock.product_name}. Available: ${dbStock.quantity}, requested: ${itemQty}` }, { status: 400 });
        }
        item.cost_price = parseFloat(dbStock.cost_price) || 0;
      } else {
        item.cost_price = 0;
      }

      const itemLineTotal = itemPrice * itemQty;
      let gstAmount = 0;
      let basePrice = itemPrice;

      if (tax_mode === 'inclusive') {
        basePrice = itemPrice / (1 + (gstRate / 100));
        gstAmount = itemLineTotal - (basePrice * itemQty);
      } else {
        gstAmount = (itemLineTotal * gstRate) / 100;
      }

      const itemTotal = tax_mode === 'inclusive' ? itemLineTotal : itemLineTotal + gstAmount;
      const discount = mrp > itemPrice ? (mrp - itemPrice) * itemQty : 0;

      processedItems.push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: itemQty,
        mrp: mrp,
        price: basePrice, // Store untaxed base price in sale_items
        cost_price: item.cost_price,
        discount: discount,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        total_price: itemTotal
      });

      subtotal += basePrice * itemQty;
      totalGst += gstAmount;
    }

    const totalDiscount = processedItems.reduce((sum, i) => sum + (i.discount || 0), 0);
    const parsedMisc = parseFloat(misc_charges) || 0;
    const totalAmount = Math.round(subtotal + totalGst + parsedMisc);
    const paid_amount = paidAmountInput !== undefined ? Number(paidAmountInput) : totalAmount;
    const dueAmount = Math.max(0, totalAmount - paid_amount);
    
    const creditDays = dueAmount > 0 ? Math.max(0, Math.floor(Number(creditDaysInput))) : 0;
    let dueDate = '';
    const todayStr = new Date().toISOString().slice(0, 10);
    const saleDate = date || todayStr;

    if (dueAmount > 0 && creditDays > 0) {
      const promised = new Date();
      promised.setDate(promised.getDate() + creditDays);
      dueDate = promised.toISOString().slice(0, 10);
    }

    // 3. Save Sale Record
    const insertSaleRes = await sql`
      INSERT INTO sales (
        invoice_number, party_id, customer_name, customer_phone, customer_address, 
        subtotal, total_gst, misc_charges, total_amount, total_discount, 
        payment_mode, paid_amount, due_amount, credit_days, due_date, tax_mode, date
      ) VALUES (
        ${invoiceNumber}, ${party_id || null}, ${customer_name}, ${customer_phone}, ${customer_address},
        ${Number(subtotal.toFixed(2))}, ${Number(totalGst.toFixed(2))}, ${parsedMisc}, ${totalAmount}, ${totalDiscount},
        ${payment_mode}, ${paid_amount}, ${dueAmount}, ${creditDays}, ${dueDate}, ${tax_mode}, ${saleDate}
      ) RETURNING id
    `;
    const saleId = insertSaleRes[0].id;

    // 4. Update Party Balance and Ledger (if party is linked)
    if (party_id) {
      await sql`
        UPDATE parties 
        SET current_balance = current_balance + ${dueAmount} 
        WHERE id = ${party_id}
      `;

      await sql`
        INSERT INTO party_transactions (
          party_id, type, reference_id, total_amount, paid_amount, due_amount, credit_days, due_date, date
        ) VALUES (
          ${party_id}, 'Sale', ${saleId}, ${totalAmount}, ${paid_amount}, ${dueAmount}, ${creditDays}, ${dueDate}, ${saleDate}
        )
      `;
    }

    // 5. Save Sale Items and deduct inventory stock
    for (const item of processedItems) {
      await sql`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, quantity, mrp, price, cost_price, discount, gst_rate, gst_amount, total_price
        ) VALUES (
          ${saleId}, ${item.product_id}, ${item.product_name}, ${item.quantity}, ${item.mrp}, ${item.price}, 
          ${item.cost_price}, ${item.discount}, ${item.gst_rate}, ${item.gst_amount}, ${item.total_price}
        )
      `;

      if (item.product_id) {
        await sql`
          UPDATE products 
          SET quantity = quantity - ${item.quantity} 
          WHERE id = ${item.product_id}
        `;
      }
    }

    const createdSale = {
      id: saleId,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      paid_amount: paid_amount,
      due_amount: dueAmount,
      items: processedItems
    };

    return NextResponse.json({ success: true, sale: createdSale });
  } catch (e) {
    console.error('Sales POST error:', e);
    return NextResponse.json({ error: 'Failed to create sale: ' + e.message }, { status: 500 });
  }
}
