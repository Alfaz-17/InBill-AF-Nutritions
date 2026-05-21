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
    const type = searchParams.get('type'); // "Customer" or "Supplier" or null (all)

    let parties;
    if (type) {
      parties = await sql`
        SELECT * FROM parties 
        WHERE (is_deleted IS NULL OR is_deleted = 0) AND type = ${type}
        ORDER BY name ASC
      `;
    } else {
      parties = await sql`
        SELECT * FROM parties 
        WHERE (is_deleted IS NULL OR is_deleted = 0)
        ORDER BY name ASC
      `;
    }

    return NextResponse.json(parties);
  } catch (e) {
    console.error('Parties GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch parties: ' + e.message }, { status: 500 });
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
    const body = await req.json();

    const {
      id,
      name,
      phone = '',
      address = '',
      gstin = '',
      type = 'Customer',
      opening_balance = 0,
      current_balance = 0
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Party name is required' }, { status: 400 });
    }

    if (id) {
      // Update existing party
      await sql`
        UPDATE parties SET
          name = ${name},
          phone = ${phone},
          address = ${address},
          gstin = ${gstin},
          type = ${type},
          opening_balance = ${opening_balance},
          current_balance = ${current_balance}
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, message: 'Party updated successfully' });
    } else {
      // Add new party
      // For a new party, current_balance is set to the opening_balance initially
      const res = await sql`
        INSERT INTO parties (
          name, phone, address, gstin, type, opening_balance, current_balance, is_deleted
        ) VALUES (
          ${name}, ${phone}, ${address}, ${gstin}, ${type}, ${opening_balance}, ${current_balance || opening_balance}, 0
        ) RETURNING id
      `;

      const newPartyId = res[0].id;

      // If there is a non-zero opening balance, log an initial transaction in ledger
      if (opening_balance !== 0) {
        const note = `Opening Balance Setup: ${opening_balance >= 0 ? 'Receivable' : 'Payable'}`;
        await sql`
          INSERT INTO party_transactions (
            party_id, type, total_amount, paid_amount, due_amount, note, date
          ) VALUES (
            ${newPartyId}, 'Opening Balance', ${Math.abs(opening_balance)}, 0, ${opening_balance}, ${note}, CURRENT_TIMESTAMP
          )
        `;
      }

      return NextResponse.json({ success: true, id: newPartyId, message: 'Party created successfully' });
    }
  } catch (e) {
    console.error('Parties POST error:', e);
    return NextResponse.json({ error: 'Failed to save party: ' + e.message }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: 'Party ID is required' }, { status: 400 });
    }

    // Soft delete party by setting is_deleted = 1
    await sql`UPDATE parties SET is_deleted = 1 WHERE id = ${id}`;

    return NextResponse.json({ success: true, message: 'Party deleted successfully' });
  } catch (e) {
    console.error('Parties DELETE error:', e);
    return NextResponse.json({ error: 'Failed to delete party: ' + e.message }, { status: 500 });
  }
}
