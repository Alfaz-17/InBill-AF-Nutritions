import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = neon(neonUrl);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';

    let rows;
    if (search) {
      rows = await sql`
        SELECT id, product_name, brand, category, selling_price, mrp, cost_price, quantity, unit, barcode, min_stock_alert
        FROM products 
        WHERE (is_deleted = 0 OR is_deleted IS NULL) 
          AND (product_name ILIKE ${'%' + search + '%'} OR brand ILIKE ${'%' + search + '%'} OR barcode ILIKE ${'%' + search + '%'})
        ORDER BY product_name ASC LIMIT 50
      `;
    } else {
      rows = await sql`
        SELECT id, product_name, brand, category, selling_price, mrp, cost_price, quantity, unit, barcode, min_stock_alert
        FROM products 
        WHERE (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY product_name ASC LIMIT 50
      `;
    }

    return NextResponse.json({ products: rows });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Inventory load failed';
    console.error('Inventory error:', message);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}
