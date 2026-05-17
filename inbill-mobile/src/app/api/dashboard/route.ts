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

    // Get business profile
    const profileRows = await sql`SELECT * FROM business_profile WHERE id = 1`;
    const profile = profileRows[0] || {};

    // Today's date range
    const today = new Date().toISOString().slice(0, 10);

    // Today's sales
    const salesRows = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total,
             COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN paid_amount ELSE 0 END), 0) as cash,
             COALESCE(SUM(CASE WHEN payment_mode != 'Cash' AND payment_mode != 'Credit' THEN paid_amount ELSE 0 END), 0) as digital,
             COALESCE(SUM(due_amount), 0) as credit
      FROM sales WHERE date::text LIKE ${today + '%'}
    `;
    const todayStats = salesRows[0] || {};

    // Receivable & Payable
    const balanceRows = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'Customer' AND current_balance > 0 THEN current_balance ELSE 0 END), 0) as receivable,
        COALESCE(SUM(CASE WHEN type = 'Supplier' AND current_balance > 0 THEN current_balance ELSE 0 END), 0) as payable
      FROM parties WHERE (is_deleted IS NULL OR is_deleted = 0)
    `;
    const balances = balanceRows[0] || {};

    // Low stock
    const lowStockRows = await sql`
      SELECT product_name, quantity, min_stock_alert 
      FROM products 
      WHERE (is_deleted = 0 OR is_deleted IS NULL) AND quantity <= min_stock_alert AND min_stock_alert > 0
      ORDER BY quantity ASC LIMIT 10
    `;

    // Recent sales
    const recentRows = await sql`
      SELECT id, invoice_number, customer_name, total_amount, payment_mode, date 
      FROM sales ORDER BY id DESC LIMIT 5
    `;

    // Total products
    const productCount = await sql`SELECT COUNT(*) as count FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)`;

    return NextResponse.json({
      profile: {
        business_name: profile.business_name,
        business_short: profile.business_short,
        currency_symbol: profile.currency_symbol || '₹',
      },
      today: {
        salesCount: Number(todayStats.count || 0),
        salesTotal: Number(todayStats.total || 0),
        cash: Number(todayStats.cash || 0),
        digital: Number(todayStats.digital || 0),
        credit: Number(todayStats.credit || 0),
      },
      receivable: Number(balances.receivable || 0),
      payable: Number(balances.payable || 0),
      lowStock: lowStockRows,
      recentSales: recentRows,
      totalProducts: Number(productCount[0]?.count || 0),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Dashboard load failed';
    console.error('Dashboard error:', message);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
