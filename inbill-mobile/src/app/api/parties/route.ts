import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = neon(neonUrl);

    const rows = await sql`
      SELECT id, name, phone, type, current_balance, opening_balance
      FROM parties 
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY name ASC
    `;

    return NextResponse.json({ parties: rows });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Parties load failed';
    console.error('Parties error:', message);
    return NextResponse.json({ error: 'Failed to load parties' }, { status: 500 });
  }
}
