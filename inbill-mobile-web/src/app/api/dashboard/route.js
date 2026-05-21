import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const neonUrl = cookieStore.get('inbill_cloud')?.value;

    if (!neonUrl) {
      return NextResponse.json({ error: 'Not authenticated. Please connect to your database.' }, { status: 401 });
    }

    const sql = neon(neonUrl);

    // Fetch business profile
    const profileRows = await sql`SELECT * FROM business_profile WHERE id = 1`;
    const profile = profileRows[0] || {};

    // Get today's local date string (YYYY-MM-DD)
    // Using simple ISO string because timezone differences are minimal for daily stats
    const today = new Date().toISOString().slice(0, 10);

    // Query today's sales
    const salesRows = await sql`
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN paid_amount ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN payment_mode = 'UPI' OR (payment_mode != 'Cash' AND payment_mode != 'Credit') THEN paid_amount ELSE 0 END), 0) as digital,
        COALESCE(SUM(due_amount), 0) as credit
      FROM sales WHERE date::text LIKE ${today + '%'}
    `;
    const todayStats = salesRows[0] || {};

    // Receivables & Payables (Customer due vs Supplier due)
    const balanceRows = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'Customer' AND current_balance > 0.1 THEN current_balance ELSE 0 END), 0) as receivable,
        ABS(COALESCE(SUM(CASE WHEN type = 'Supplier' AND current_balance < -0.1 THEN current_balance ELSE 0 END), 0)) as payable
      FROM parties WHERE (is_deleted IS NULL OR is_deleted = 0)
    `;
    const balances = balanceRows[0] || {};

    // Low stock alerts
    const lowStockRows = await sql`
      SELECT id, product_name, quantity, min_stock_alert, brand, category, unit
      FROM products 
      WHERE (is_deleted = 0 OR is_deleted IS NULL) AND quantity <= min_stock_alert AND min_stock_alert > 0
      ORDER BY quantity ASC LIMIT 10
    `;

    // Today's total expenses
    const expenseRows = await sql`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses WHERE date::text LIKE ${today + '%'}
    `;
    const todayExpenses = expenseRows[0]?.total || 0;

    // Recent sales
    const recentRows = await sql`
      SELECT id, invoice_number, customer_name, total_amount, payment_mode, date, due_amount
      FROM sales ORDER BY id DESC LIMIT 10
    `;

    // Total products count
    const productCountRows = await sql`SELECT COUNT(*) as count FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)`;
    const totalProducts = Number(productCountRows[0]?.count || 0);

    return NextResponse.json({
      profile: {
        business_name: profile.business_name || 'My Business',
        business_short: profile.business_short || 'IB',
        currency_symbol: profile.currency_symbol || '₹',
        tagline: profile.tagline || '',
        phone: profile.phone || '',
        email: profile.email || '',
        address_line1: profile.address_line1 || '',
        address_line2: profile.address_line2 || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
        gstin: profile.gstin || '',
        logo_path: profile.logo_path || '',
        terms_and_conditions: profile.terms_and_conditions || '',
        bank_details: profile.bank_details || '',
        software_password: profile.software_password || '',
      },
      today: {
        salesCount: Number(todayStats.count || 0),
        salesTotal: Number(todayStats.total || 0),
        cash: Number(todayStats.cash || 0),
        digital: Number(todayStats.digital || 0),
        credit: Number(todayStats.credit || 0),
        expenses: Number(todayExpenses),
      },
      receivable: Number(balances.receivable || 0),
      payable: Number(balances.payable || 0),
      lowStock: lowStockRows,
      recentSales: recentRows,
      totalProducts,
    });
  } catch (e) {
    console.error('Dashboard API error:', e);
    return NextResponse.json({ error: 'Failed to load dashboard data: ' + e.message }, { status: 500 });
  }
}
