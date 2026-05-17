import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await req.json();
    const { items } = payload;
    const taxMode = payload.tax_mode || 'exclusive';

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Sale must have at least one item.' }, { status: 400 });
    }

    const sql = neon(neonUrl);

    // 1. Get profile invoice prefix
    const profileRows = await sql`SELECT invoice_prefix FROM business_profile WHERE id = 1`;
    const prefix = profileRows[0]?.invoice_prefix || 'INV';

    // 2. Generate invoice number
    const lastSaleRows = await sql`SELECT invoice_number FROM sales ORDER BY id DESC LIMIT 1`;
    let invoiceNumber = `${prefix}-001`;
    if (lastSaleRows.length > 0) {
      const lastNumMatch = lastSaleRows[0].invoice_number.match(/\d+$/);
      const nextNum = lastNumMatch ? parseInt(lastNumMatch[0], 10) + 1 : 1;
      invoiceNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    }

    // 3. Process items, fetch cost prices, and run stock validation
    let subtotal = 0;
    let totalGst = 0;
    let totalDiscount = 0;
    const processedItems = [];

    for (const item of items) {
      const itemQty = Number(item.quantity) || 0;
      const itemPrice = parseFloat(item.price) || 0;
      const itemGstRate = parseFloat(item.gst_rate) || 0;
      const itemMRP = parseFloat(item.mrp || item.price) || 0;

      if (itemQty <= 0) {
        return NextResponse.json({ error: `Invalid quantity for ${item.product_name || 'Item'}.` }, { status: 400 });
      }

      // Stock check in PostgreSQL
      const prodRows = await sql`SELECT product_name, quantity, cost_price FROM products WHERE id = ${item.product_id} AND (is_deleted = 0 OR is_deleted IS NULL)`;
      if (prodRows.length === 0) {
        return NextResponse.json({ error: `Product not found: ${item.product_name}` }, { status: 400 });
      }

      const prod = prodRows[0];
      if (Number(prod.quantity || 0) < itemQty) {
        return NextResponse.json({ 
          error: `Insufficient stock for ${prod.product_name}. Available: ${prod.quantity}, requested: ${itemQty}` 
        }, { status: 400 });
      }

      const itemLineTotal = itemPrice * itemQty;
      let gstAmount = 0;
      let basePrice = itemPrice;

      if (taxMode === 'inclusive') {
        basePrice = itemPrice / (1 + (itemGstRate / 100));
        gstAmount = itemLineTotal - (basePrice * itemQty);
      } else {
        gstAmount = (itemLineTotal * itemGstRate) / 100;
      }

      const itemTotal = taxMode === 'inclusive' ? itemLineTotal : itemLineTotal + gstAmount;
      const discount = itemMRP > itemPrice ? (itemMRP - itemPrice) * itemQty : 0;

      subtotal += basePrice * itemQty;
      totalGst += gstAmount;
      totalDiscount += discount;

      processedItems.push({
        product_id: item.product_id,
        product_name: prod.product_name,
        quantity: itemQty,
        mrp: itemMRP,
        price: basePrice,
        cost_price: prod.cost_price || 0,
        gst_rate: itemGstRate,
        gst_amount: gstAmount,
        total_price: itemTotal,
        discount
      });
    }

    const miscCharges = parseFloat(payload.misc_charges) || 0;
    const totalAmount = Math.round(subtotal + totalGst + miscCharges);
    const paidAmount = payload.paid_amount !== undefined ? Number(payload.paid_amount) : totalAmount;
    const dueAmount = Math.max(0, totalAmount - paidAmount);

    const creditDays = dueAmount > 0 ? Math.max(0, Math.floor(Number(payload.credit_days || 0))) : 0;
    let dueDate = '';
    if (dueAmount > 0 && creditDays > 0) {
      const promised = new Date();
      promised.setDate(promised.getDate() + creditDays);
      dueDate = promised.getFullYear() + '-' + String(promised.getMonth() + 1).padStart(2, '0') + '-' + String(promised.getDate()).padStart(2, '0');
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // 4. Party Auto-Matching & Ledger Registration
    let finalPartyId = payload.party_id || null;

    if (!finalPartyId && payload.customer_name && payload.customer_name.trim() !== '') {
      const trimmedName = payload.customer_name.trim();
      const matchedParties = await sql`
        SELECT id FROM parties 
        WHERE LOWER(TRIM(name)) = ${trimmedName.toLowerCase()} 
        AND type = 'Customer' 
        AND (is_deleted = 0 OR is_deleted IS NULL)
        LIMIT 1
      `;
      if (matchedParties.length > 0) {
        finalPartyId = matchedParties[0].id;
      } else if (dueAmount > 0 && trimmedName.toLowerCase() !== 'cash') {
        const createdParty = await sql`
          INSERT INTO parties (name, phone, address, type, current_balance, opening_balance, is_deleted)
          VALUES (${trimmedName}, ${payload.customer_phone || ''}, ${payload.customer_address || ''}, 'Customer', 0, 0, 0)
          RETURNING id
        `;
        finalPartyId = createdParty[0].id;
      }
    }

    // 4.5 Insert Sale
    const salesInsertResult = await sql`
      INSERT INTO sales (invoice_number, date, party_id, customer_name, customer_phone, customer_address, subtotal, total_gst, misc_charges, total_amount, total_discount, payment_mode, paid_amount, due_amount, credit_days, due_date, tax_mode)
      VALUES (${invoiceNumber}, ${nowStr}, ${finalPartyId}, ${payload.customer_name || ''}, ${payload.customer_phone || ''}, ${payload.customer_address || ''}, ${Number(subtotal.toFixed(2))}, ${Number(totalGst.toFixed(2))}, ${miscCharges}, ${totalAmount}, ${totalDiscount}, ${payload.payment_mode || 'Cash'}, ${paidAmount}, ${dueAmount}, ${creditDays}, ${dueDate}, ${taxMode})
      RETURNING id
    `;
    const saleId = salesInsertResult[0].id;

    // 5. Insert sale items & deduct stock quantities
    for (const item of processedItems) {
      await sql`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, mrp, price, cost_price, discount, gst_rate, gst_amount, total_price)
        VALUES (${saleId}, ${item.product_id}, ${item.product_name}, ${item.quantity}, ${item.mrp}, ${item.price}, ${item.cost_price}, ${item.discount}, ${item.gst_rate}, ${item.gst_amount}, ${item.total_price})
      `;

      await sql`
        UPDATE products SET quantity = quantity - ${item.quantity} WHERE id = ${item.product_id}
      `;
    }

    // 6. Update ledger and party transactions if linked to customer
    if (finalPartyId) {
      await sql`
        UPDATE parties SET current_balance = current_balance + ${dueAmount} WHERE id = ${finalPartyId}
      `;

      await sql`
        INSERT INTO party_transactions (party_id, type, reference_id, total_amount, paid_amount, due_amount, payment_mode, credit_days, due_date, date)
        VALUES (${finalPartyId}, 'Sale', ${saleId}, ${totalAmount}, ${paidAmount}, ${dueAmount}, ${payload.payment_mode || 'Cash'}, ${creditDays}, ${dueDate}, ${nowStr})
      `;
    }

    return NextResponse.json({
      success: true,
      sale_id: saleId,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create sale';
    console.error('Create mobile sale error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
