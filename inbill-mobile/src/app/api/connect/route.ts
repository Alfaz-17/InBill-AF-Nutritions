import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { code, neonUrl } = await req.json();

    if (!code || !neonUrl) {
      return NextResponse.json({ error: 'Access code and cloud URL are required' }, { status: 400 });
    }

    // Connect to the user's Neon database and verify the access code
    const sql = neon(neonUrl);

    const rows = await sql`
      SELECT mobile_access_code, mobile_secret, business_name, business_short, currency_symbol 
      FROM business_profile WHERE id = 1
    `;

    if (!rows.length || rows[0].mobile_access_code !== code) {
      return NextResponse.json({ error: 'Invalid access code. Generate a new one from Desktop Settings → Mobile.' }, { status: 401 });
    }

    const profile = rows[0];

    // Return session info (the neonUrl is stored in httpOnly cookie for security)
    const response = NextResponse.json({
      success: true,
      business: {
        name: profile.business_name || 'My Business',
        short: profile.business_short || 'IB',
        currency: profile.currency_symbol || '₹',
      }
    });

    // Store connection URL in httpOnly cookie (never exposed to client JS)
    response.cookies.set('inbill_cloud', neonUrl, {
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Connection failed';
    console.error('Connect error:', message);
    return NextResponse.json({ error: 'Could not connect to cloud database. Check URL.' }, { status: 500 });
  }
}
