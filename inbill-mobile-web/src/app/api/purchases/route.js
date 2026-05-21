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
    
    // Fetch purchases, join suppliers names
    const purchases = await sql`
      SELECT pur.*, p.name as supplier_name_joined
      FROM purchases pur
      LEFT JOIN parties p ON pur.party_id = p.id
      ORDER BY pur.id DESC
    `;

    return NextResponse.json(purchases);
  } catch (e) {
    console.error('Purchases GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch purchases: ' + e.message }, { status: 500 });
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
    const purchaseData = await req.json();

    const {
      party_id,
      supplier_name = '',
      items = [],
      other_charges = 0,
      paid_amount = 0,
      date
    } = purchaseData;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Purchase must have at least one item' }, { status: 400 });
    }

    // 1. Calculate totals
    let itemsTotal = 0;
    for (const item of items) {
      itemsTotal += (parseFloat(item.price) || 0) * (Number(item.quantity) || 0);
    }
    const parsedOther = parseFloat(other_charges) || 0;
    const totalAmount = itemsTotal + parsedOther;
    const parsedPaid = parseFloat(paid_amount) || 0;
    const dueAmount = totalAmount - parsedPaid;

    const todayStr = new Date().toISOString().slice(0, 10);
    const purchaseDate = date || todayStr;

    // 2. Insert purchase row
    const insertPurRes = await sql`
      INSERT INTO purchases (
        party_id, supplier_name, total_amount, paid_amount, due_amount, other_charges, date
      ) VALUES (
        ${party_id || null}, ${supplier_name}, ${totalAmount}, ${parsedPaid}, ${dueAmount}, ${parsedOther}, ${purchaseDate}
      ) RETURNING id
    `;
    const purchaseId = insertPurRes[0].id;

    // 3. Update Party Balance and Log Ledger (if party is linked)
    if (party_id) {
      // For suppliers: We owe them more money, so current_balance DECREASES (becomes more negative)
      const balanceImpact = totalAmount - parsedPaid;
      await sql`
        UPDATE parties 
        SET current_balance = current_balance - ${balanceImpact} 
        WHERE id = ${party_id}
      `;

      await sql`
        INSERT INTO party_transactions (
          party_id, type, reference_id, total_amount, paid_amount, due_amount, date
        ) VALUES (
          ${party_id}, 'Purchase', ${purchaseId}, ${totalAmount}, ${parsedPaid}, ${balanceImpact}, ${purchaseDate}
        )
      `;
    }

    let updatedCount = 0;
    let createdCount = 0;

    // 4. Save Purchase Items and upsert Products inventory
    for (const item of items) {
      const trimmedName = (item.product_name || '').trim();
      const purchasePrice = parseFloat(item.price) || 0;
      const itemQty = Number(item.quantity) || 0;
      const gstRate = parseFloat(item.gst_rate) || 0;
      const mrp = parseFloat(item.mrp || purchasePrice) || 0;
      const sellingPrice = parseFloat(item.selling_price || mrp) || purchasePrice * 1.2;

      if (!trimmedName) continue;

      // Find if product already exists (by name, case-insensitive, ignores spaces)
      const matchedProducts = await sql`
        SELECT id, custom_fields FROM products 
        WHERE LOWER(REPLACE(product_name, ' ', '')) = LOWER(REPLACE(${trimmedName}, ' ', ''))
        ORDER BY is_deleted DESC LIMIT 1
      `;

      let targetId;
      if (matchedProducts.length > 0) {
        // Product exists! Resurrect and update it
        targetId = matchedProducts[0].id;
        let mergedFields = {};
        try {
          mergedFields = JSON.parse(matchedProducts[0].custom_fields || '{}');
        } catch (e) {}
        Object.assign(mergedFields, item.custom_fields || {});

        await sql`
          UPDATE products 
          SET 
            quantity = quantity + ${itemQty}, 
            batch_number = ${item.batch_number || ''}, 
            expiry_date = ${item.expiry_date || ''},
            cost_price = ${purchasePrice}, 
            mrp = ${mrp}, 
            selling_price = ${sellingPrice}, 
            product_size = ${item.product_size || ''},
            gst_rate = ${gstRate}, 
            cgst = ${gstRate / 2}, 
            sgst = ${gstRate / 2}, 
            custom_fields = ${JSON.stringify(mergedFields)}, 
            is_deleted = 0
          WHERE id = ${targetId}
        `;
        updatedCount++;
      } else {
        // Product does not exist! Create a new one
        const insertProdRes = await sql`
          INSERT INTO products (
            product_name, brand, category, product_size, unit, cost_price, mrp, selling_price, 
            gst_rate, cgst, sgst, quantity, batch_number, expiry_date, custom_fields, is_deleted
          ) VALUES (
            ${trimmedName}, '', ${item.category || ''}, ${item.product_size || ''}, 'pcs', 
            ${purchasePrice}, ${mrp}, ${sellingPrice}, ${gstRate}, ${gstRate / 2}, ${gstRate / 2}, 
            ${itemQty}, ${item.batch_number || ''}, ${item.expiry_date || ''}, ${JSON.stringify(item.custom_fields || {})}, 0
          ) RETURNING id
        `;
        targetId = insertProdRes[0].id;
        createdCount++;
      }

      // Link to purchase items list
      await sql`
        INSERT INTO purchase_items (
          purchase_id, product_id, product_name, quantity, price, batch_number, expiry_date
        ) VALUES (
          ${purchaseId}, ${targetId}, ${trimmedName}, ${itemQty}, ${purchasePrice}, 
          ${item.batch_number || ''}, ${item.expiry_date || ''}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      purchaseId,
      totalAmount,
      updatedCount,
      createdCount,
      message: 'Purchase recorded and stock adjusted successfully'
    });
  } catch (e) {
    console.error('Purchases POST error:', e);
    return NextResponse.json({ error: 'Failed to record purchase: ' + e.message }, { status: 500 });
  }
}
