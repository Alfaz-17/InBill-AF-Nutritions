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
    const partyId = searchParams.get('id');

    if (!partyId) {
      return NextResponse.json({ error: 'Party ID is required' }, { status: 400 });
    }

    // Get party profile
    const partyRows = await sql`SELECT * FROM parties WHERE id = ${partyId}`;
    if (!partyRows.length) {
      return NextResponse.json({ error: 'Party not found' }, { status: 444 });
    }
    const party = partyRows[0];

    // Get all transactions for the party
    const transactions = await sql`
      SELECT * FROM party_transactions 
      WHERE party_id = ${partyId} 
      ORDER BY date DESC, id DESC
    `;

    return NextResponse.json({
      party,
      ledger: transactions
    });
  } catch (e) {
    console.error('Ledger GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch ledger: ' + e.message }, { status: 500 });
  }
}
