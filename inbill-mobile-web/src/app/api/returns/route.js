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
    const type = searchParams.get('type') || 'sale'; // 'sale' or 'purchase'

    if (type === 'sale') {
      const returns = await sql`
        SELECT r.*, s.invoice_number, p.name as customer_name 
        FROM returns r
        LEFT JOIN sales s ON r.sale_id = s.id
        LEFT JOIN parties p ON r.party_id = p.id
        ORDER BY r.date DESC
      `;
      // Fetch return items inline or we can fetch them individually, but let's send them inline or let them fetch per return
      for (const ret of returns) {
        ret.items = await sql`SELECT * FROM return_items WHERE return_id = ${ret.id}`;
      }
      return NextResponse.json(returns);
    } else {
      const returns = await sql`
        SELECT r.*, p.invoice_number as purchase_invoice, pr.name as supplier_name 
        FROM purchase_returns r
        LEFT JOIN purchases p ON r.purchase_id = p.id
        LEFT JOIN parties pr ON r.party_id = pr.id
        ORDER BY r.date DESC
      `;
      for (const ret of returns) {
        ret.items = await sql`SELECT * FROM purchase_return_items WHERE purchase_return_id = ${ret.id}`;
      }
      return NextResponse.json(returns);
    }
  } catch (e) {
    console.error('Returns GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch returns: ' + e.message }, { status: 500 });
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
    const data = await req.json();

    const {
      type = 'sale', // 'sale' or 'purchase'
      sale_id,
      purchase_id,
      party_id,
      total_amount,
      payment_mode = 'Credit',
      reason = '',
      items = [],
      date
    } = data;

    const returnTotal = parseFloat(total_amount) || 0;
    if (returnTotal <= 0) {
      return NextResponse.json({ error: 'Total return amount must be greater than zero' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Return must have at least one item' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const returnDate = date || todayStr;

    if (type === 'sale') {
      // --- SALES RETURN LOGIC ---
      // 1. Validate remaining quantity
      for (const item of items) {
        if (sale_id && item.product_id) {
          const soldItemRows = await sql`
            SELECT quantity FROM sale_items 
            WHERE sale_id = ${sale_id} AND product_id = ${item.product_id}
          `;
          const soldQty = soldItemRows[0]?.quantity || 0;

          const returnedRows = await sql`
            SELECT COALESCE(SUM(ri.quantity), 0) as qty 
            FROM return_items ri
            JOIN returns r ON ri.return_id = r.id
            WHERE r.sale_id = ${sale_id} AND ri.product_id = ${item.product_id}
          `;
          const alreadyReturned = Number(returnedRows[0]?.qty || 0);
          const remaining = soldQty - alreadyReturned;

          if (item.quantity > remaining) {
            return NextResponse.json({ 
              error: `Cannot return ${item.quantity} of ${item.product_name || 'product'}. Only ${remaining} remaining.` 
            }, { status: 400 });
          }
        }
      }

      // 2. Calculate smart split
      let debtCleared = 0;
      let refundAmount = 0;

      if (sale_id) {
        const saleRows = await sql`SELECT due_amount, paid_amount FROM sales WHERE id = ${sale_id}`;
        if (saleRows.length > 0) {
          const originalSale = saleRows[0];
          debtCleared = Math.min(returnTotal, Number(originalSale.due_amount || 0));
          refundAmount = returnTotal - debtCleared;
        }
      } else {
        refundAmount = returnTotal;
      }

      // 3. Insert returns record
      const returnInsertRes = await sql`
        INSERT INTO returns (
          sale_id, party_id, total_amount, debt_cleared_amount, refund_amount, payment_mode, reason, date
        ) VALUES (
          ${sale_id || null}, ${party_id || null}, ${returnTotal}, ${debtCleared}, ${refundAmount}, ${payment_mode}, ${reason}, ${returnDate}
        ) RETURNING id
      `;
      const returnId = returnInsertRes[0].id;

      // 4. Save items & Update stock
      for (const item of items) {
        let pName = item.product_name;
        if (!pName && item.product_id) {
          const pRows = await sql`SELECT product_name FROM products WHERE id = ${item.product_id}`;
          pName = pRows[0]?.product_name || 'Unknown Product';
        }
        
        await sql`
          INSERT INTO return_items (
            return_id, product_id, product_name, quantity, price, total_price
          ) VALUES (
            ${returnId}, ${item.product_id}, ${pName}, ${item.quantity}, ${item.price}, ${item.quantity * item.price}
          )
        `;

        if (item.product_id) {
          await sql`UPDATE products SET quantity = quantity + ${item.quantity} WHERE id = ${item.product_id}`;
        }
      }

      // 5. Update Party Balance and Log Ledger
      if (party_id) {
        if (debtCleared > 0) {
          await sql`UPDATE parties SET current_balance = current_balance - ${debtCleared} WHERE id = ${party_id}`;
          await sql`
            INSERT INTO party_transactions (party_id, type, reference_id, total_amount, note, date)
            VALUES (${party_id}, 'Sales Return', ${returnId}, ${debtCleared}, ${`Debt Cleared for Sale ID: ${sale_id || 'N/A'}`}, ${returnDate})
          `;
        }

        if (refundAmount > 0 && payment_mode === 'Credit') {
          await sql`UPDATE parties SET current_balance = current_balance - ${refundAmount} WHERE id = ${party_id}`;
          await sql`
            INSERT INTO party_transactions (party_id, type, reference_id, total_amount, note, date)
            VALUES (${party_id}, 'Sales Return', ${returnId}, ${refundAmount}, ${`Store Credit from Return ID: ${returnId}`}, ${returnDate})
          `;
        }
      }

      // 6. Update Original Sale Record
      if (sale_id) {
        await sql`
          UPDATE sales 
          SET due_amount = GREATEST(0, due_amount - ${debtCleared}),
              returned_total = returned_total + ${returnTotal}
          WHERE id = ${sale_id}
        `;

        await sql`
          UPDATE party_transactions 
          SET due_amount = GREATEST(0, due_amount - ${debtCleared}) 
          WHERE type = 'Sale' AND reference_id = ${sale_id}
        `;

        for (const item of items) {
          if (item.product_id) {
            await sql`
              UPDATE sale_items 
              SET returned_quantity = returned_quantity + ${item.quantity} 
              WHERE sale_id = ${sale_id} AND product_id = ${item.product_id}
            `;
          }
        }
      }

      return NextResponse.json({ success: true, returnId });
    } else {
      // --- PURCHASE RETURN LOGIC ---
      // 1. Calculate smart split
      let debtCleared = 0;
      let refundAmount = 0;

      if (purchase_id) {
        const purchaseRows = await sql`SELECT due_amount FROM purchases WHERE id = ${purchase_id}`;
        if (purchaseRows.length > 0) {
          const originalPur = purchaseRows[0];
          debtCleared = Math.min(returnTotal, Number(originalPur.due_amount || 0));
          refundAmount = returnTotal - debtCleared;
        }
      } else {
        refundAmount = returnTotal;
      }

      // 2. Insert purchase return record
      const returnInsertRes = await sql`
        INSERT INTO purchase_returns (
          purchase_id, party_id, total_amount, debt_cleared_amount, refund_amount, payment_mode, reason, date
        ) VALUES (
          ${purchase_id || null}, ${party_id || null}, ${returnTotal}, ${debtCleared}, ${refundAmount}, ${payment_mode}, ${reason}, ${returnDate}
        ) RETURNING id
      `;
      const pReturnId = returnInsertRes[0].id;

      // 3. Save items & Update stock (decreases inventory stock)
      for (const item of items) {
        let pName = item.product_name;
        if (!pName && item.product_id) {
          const pRows = await sql`SELECT product_name FROM products WHERE id = ${item.product_id}`;
          pName = pRows[0]?.product_name || 'Unknown Product';
        }

        await sql`
          INSERT INTO purchase_return_items (
            purchase_return_id, product_id, product_name, quantity, price, total_price
          ) VALUES (
            ${pReturnId}, ${item.product_id}, ${pName}, ${item.quantity}, ${item.price}, ${item.quantity * item.price}
          )
        `;

        if (item.product_id) {
          await sql`UPDATE products SET quantity = quantity - ${item.quantity} WHERE id = ${item.product_id}`;
        }
      }

      // 4. Update Party Balance and Log Ledger
      if (party_id) {
        // Supplier balance increases (towards 0 or positive store credit, since we owe them less)
        if (debtCleared > 0) {
          await sql`UPDATE parties SET current_balance = current_balance + ${debtCleared} WHERE id = ${party_id}`;
          await sql`
            INSERT INTO party_transactions (party_id, type, reference_id, total_amount, note, date)
            VALUES (${party_id}, 'Purchase Return', ${pReturnId}, ${debtCleared}, ${`Debt Cleared for Purchase ID: ${purchase_id || 'N/A'}`}, ${returnDate})
          `;
        }

        if (refundAmount > 0 && payment_mode === 'Credit') {
          await sql`UPDATE parties SET current_balance = current_balance + ${refundAmount} WHERE id = ${party_id}`;
          await sql`
            INSERT INTO party_transactions (party_id, type, reference_id, total_amount, note, date)
            VALUES (${party_id}, 'Purchase Return', ${pReturnId}, ${refundAmount}, ${`Supplier Credit from Return ID: ${pReturnId}`}, ${returnDate})
          `;
        }
      }

      // 5. Update Original Purchase Record (Reduce its due amount)
      if (purchase_id) {
        await sql`
          UPDATE purchases 
          SET due_amount = GREATEST(0, due_amount - ${debtCleared}) 
          WHERE id = ${purchase_id}
        `;
      }

      return NextResponse.json({ success: true, pReturnId });
    }
  } catch (e) {
    console.error('Returns POST error:', e);
    return NextResponse.json({ error: 'Failed to create return: ' + e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = neon(neonUrl);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'sale'; // 'sale' or 'purchase'

    if (!id) {
      return NextResponse.json({ error: 'Return ID is required' }, { status: 400 });
    }

    if (type === 'sale') {
      // 1. Fetch return record
      const returnRows = await sql`SELECT * FROM returns WHERE id = ${id}`;
      if (!returnRows.length) {
        return NextResponse.json({ error: 'Return not found' }, { status: 404 });
      }
      const ret = returnRows[0];

      // 2. Fetch return items
      const items = await sql`SELECT * FROM return_items WHERE return_id = ${id}`;

      // 3. Reverse Stock (Subtract what was returned)
      for (const item of items) {
        if (item.product_id) {
          await sql`UPDATE products SET quantity = quantity - ${item.quantity} WHERE id = ${item.product_id}`;
        }
      }

      // 4. Reverse Smart Reconciliation
      if (ret.party_id) {
        const debtCleared = Number(ret.debt_cleared_amount || 0);
        const refundAmount = Number(ret.refund_amount || 0);
        const totalCreditImpact = debtCleared + (ret.payment_mode === 'Credit' ? refundAmount : 0);
        
        if (totalCreditImpact > 0) {
          await sql`UPDATE parties SET current_balance = current_balance + ${totalCreditImpact} WHERE id = ${ret.party_id}`;
        }

        // Delete ledger entries
        await sql`DELETE FROM party_transactions WHERE type = 'Sales Return' AND reference_id = ${id}`;
      }

      // 5. Reverse Original Sale Due & quantities
      if (ret.sale_id) {
        const debtCleared = Number(ret.debt_cleared_amount || 0);
        if (debtCleared > 0) {
          await sql`UPDATE sales SET due_amount = due_amount + ${debtCleared} WHERE id = ${ret.sale_id}`;
          await sql`
            UPDATE party_transactions 
            SET due_amount = due_amount + ${debtCleared} 
            WHERE type = 'Sale' AND reference_id = ${ret.sale_id}
          `;
        }

        await sql`UPDATE sales SET returned_total = GREATEST(0, returned_total - ${ret.total_amount}) WHERE id = ${ret.sale_id}`;

        for (const item of items) {
          if (item.product_id) {
            await sql`
              UPDATE sale_items 
              SET returned_quantity = GREATEST(0, returned_quantity - ${item.quantity}) 
              WHERE sale_id = ${ret.sale_id} AND product_id = ${item.product_id}
            `;
          }
        }
      }

      // 6. Delete return records
      await sql`DELETE FROM return_items WHERE return_id = ${id}`;
      await sql`DELETE FROM returns WHERE id = ${id}`;

      return NextResponse.json({ success: true, message: 'Sale return deleted successfully' });
    } else {
      // 1. Fetch return record
      const returnRows = await sql`SELECT * FROM purchase_returns WHERE id = ${id}`;
      if (!returnRows.length) {
        return NextResponse.json({ error: 'Return not found' }, { status: 404 });
      }
      const ret = returnRows[0];

      // 2. Fetch items
      const items = await sql`SELECT * FROM purchase_return_items WHERE purchase_return_id = ${id}`;

      // 3. Reverse Stock (Add back what was sent back)
      for (const item of items) {
        if (item.product_id) {
          await sql`UPDATE products SET quantity = quantity + ${item.quantity} WHERE id = ${item.product_id}`;
        }
      }

      // 4. Reverse Smart Reconciliation
      if (ret.party_id) {
        const debtCleared = Number(ret.debt_cleared_amount || 0);
        const refundAmount = Number(ret.refund_amount || 0);
        const totalCreditImpact = debtCleared + (ret.payment_mode === 'Credit' ? refundAmount : 0);

        if (totalCreditImpact > 0) {
          await sql`UPDATE parties SET current_balance = current_balance - ${totalCreditImpact} WHERE id = ${ret.party_id}`;
        }

        // Delete ledger entries
        await sql`DELETE FROM party_transactions WHERE type = 'Purchase Return' AND reference_id = ${id}`;
      }

      // 5. Reverse Original Purchase Due
      if (ret.purchase_id) {
        await sql`UPDATE purchases SET due_amount = due_amount + ${ret.total_amount} WHERE id = ${ret.purchase_id}`;
      }

      // 6. Delete records
      await sql`DELETE FROM purchase_return_items WHERE purchase_return_id = ${id}`;
      await sql`DELETE FROM purchase_returns WHERE id = ${id}`;

      return NextResponse.json({ success: true, message: 'Purchase return deleted successfully' });
    }
  } catch (e) {
    console.error('Returns DELETE error:', e);
    return NextResponse.json({ error: 'Failed to delete return: ' + e.message }, { status: 500 });
  }
}
