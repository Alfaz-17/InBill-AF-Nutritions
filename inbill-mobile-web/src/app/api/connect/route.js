import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { code, neonUrl } = await req.json();

    if (!code || !neonUrl) {
      return NextResponse.json({ error: 'Access code and cloud URL are required' }, { status: 400 });
    }

    // Clean and normalize the database URL
    let cleanUrl = neonUrl.trim();
    if (cleanUrl.startsWith('psql ')) {
      cleanUrl = cleanUrl.replace(/^psql\s+['"]?|['"]?$/g, '');
    } else {
      cleanUrl = cleanUrl.replace(/^['"]|['"]$/g, '');
    }

    const sql = neon(cleanUrl);

    // Verify the access code against the database
    const rows = await sql`
      SELECT mobile_access_code, mobile_secret, business_name, business_short, currency_symbol 
      FROM business_profile WHERE id = 1
    `;

    if (!rows.length || rows[0].mobile_access_code !== code) {
      return NextResponse.json({ error: 'Invalid access code. Please generate a new code from Desktop Settings → Mobile Access.' }, { status: 401 });
    }

    const profile = rows[0];

    const response = NextResponse.json({
      success: true,
      business: {
        name: profile.business_name || 'InBill Store',
        short: profile.business_short || 'IB',
        currency: profile.currency_symbol || '₹',
      }
    });

    // Store connection URL in secure httpOnly cookies
    response.cookies.set('inbill_cloud', cleanUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    response.cookies.set('inbill_code', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (e) {
    console.error('Connect API error:', e);
    return NextResponse.json({ error: 'Failed to connect to cloud database: ' + e.message }, { status: 500 });
  }
}
