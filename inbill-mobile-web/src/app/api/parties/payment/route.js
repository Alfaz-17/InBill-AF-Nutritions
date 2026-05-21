import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = neon(neonUrl);
    const data = await req.json();

    const { party_id, amount, payment_mode = 'Cash', note = '', date } = data;
    const paymentAmount = Number(amount || 0);

    if (!party_id) {
      return NextResponse.json({ error: 'Party ID is required' }, { status: 400 });
    }
    if (paymentAmount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than zero' }, { status: 400 });
    }

    // Get party profile
    const partyRows = await sql`SELECT type, current_balance FROM parties WHERE id = ${party_id}`;
    if (!partyRows.length) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }
    const party = partyRows[0];

    // Validate payment amount against current outstanding balance
    if (party.type === 'Supplier') {
      const payable = Math.max(0, Math.abs(Number(party.current_balance || 0)));
      if (paymentAmount > payable + 0.1) {
        return NextResponse.json({ error: `Payment exceeds outstanding payable. Maximum allowed: ${payable}` }, { status: 400 });
      }
    } else {
      const receivable = Math.max(0, Number(party.current_balance || 0));
      if (paymentAmount > receivable + 0.1) {
        return NextResponse.json({ error: `Payment exceeds outstanding receivable. Maximum allowed: ${receivable}` }, { status: 400 });
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const txnDate = date || today;

    // Use Postgres transactional commands to execute payment logic in series
    // 1. Insert Payment in party_transactions
    await sql`
      INSERT INTO party_transactions (party_id, type, total_amount, paid_amount, payment_mode, note, date)
      VALUES (${party_id}, 'Payment', ${paymentAmount}, ${paymentAmount}, ${payment_mode}, ${note}, ${txnDate})
    `;

    // 2. Update Party Current Balance
    const direction = party.type === 'Supplier' ? 1 : -1;
    const balanceAdjustment = paymentAmount * direction;
    await sql`
      UPDATE parties 
      SET current_balance = current_balance + ${balanceAdjustment} 
      WHERE id = ${party_id}
    `;

    // 3. Smart Debt Reconciliation (FIFO Allocation)
    let remaining = paymentAmount;
    const openDues = await sql`
      SELECT id, reference_id, type, due_amount
      FROM party_transactions
      WHERE party_id = ${party_id}
        AND type IN ('Sale', 'Purchase')
        AND due_amount > 0.1
      ORDER BY COALESCE(NULLIF(due_date, ''), date) ASC, id ASC
    `;

    for (const due of openDues) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, Number(due.due_amount || 0));

      // Update party_transactions's due_amount
      await sql`
        UPDATE party_transactions 
        SET due_amount = GREATEST(0, due_amount - ${applied}) 
        WHERE id = ${due.id}
      `;

      // Update underlying sales/purchases records
      if (due.type === 'Sale' && due.reference_id) {
        await sql`
          UPDATE sales 
          SET due_amount = GREATEST(0, due_amount - ${applied}) 
          WHERE id = ${due.reference_id}
        `;
      } else if (due.type === 'Purchase' && due.reference_id) {
        await sql`
          UPDATE purchases 
          SET due_amount = GREATEST(0, due_amount - ${applied}) 
          WHERE id = ${due.reference_id}
        `;
      }

      remaining -= applied;
    }

    return NextResponse.json({ success: true, message: 'Payment recorded successfully' });
  } catch (e) {
    console.error('Payment POST error:', e);
    return NextResponse.json({ error: 'Failed to record payment: ' + e.message }, { status: 500 });
  }
}
