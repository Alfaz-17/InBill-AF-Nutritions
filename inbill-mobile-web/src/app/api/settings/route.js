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
    
    const profileRows = await sql`SELECT * FROM business_profile WHERE id = 1`;
    const profile = profileRows[0] || {};
    
    const attributeDefs = await sql`SELECT * FROM product_attribute_defs ORDER BY id ASC`;
    const customCategories = await sql`SELECT * FROM custom_categories ORDER BY sort_order ASC, name ASC`;

    return NextResponse.json({ profile, attributeDefs, customCategories });
  } catch (e) {
    console.error('Settings GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch settings: ' + e.message }, { status: 500 });
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
    const { action = 'update_profile', profileData, attributeDef, categoryData, deleteDefId, deleteCatId } = body;

    if (action === 'update_profile') {
      if (!profileData) {
        return NextResponse.json({ error: 'Profile data is required' }, { status: 400 });
      }

      const {
        business_name = 'InBill Store',
        business_short = 'IB',
        tagline = 'Billing & Inventory',
        phone = '',
        email = '',
        gstin = '',
        address_line1 = '',
        address_line2 = '',
        city = '',
        state = '',
        pincode = '',
        currency_symbol = '₹',
        terms_and_conditions = '',
        whatsapp_number = '',
        instagram_id = '',
        pan_number = '',
        bank_details = '',
        invoice_prefix = 'INV',
        invoice_footer = 'Thank you for your business!',
        gemini_api_key = ''
      } = profileData;

      // Update business profile
      await sql`
        UPDATE business_profile
        SET
          business_name = ${business_name},
          business_short = ${business_short},
          tagline = ${tagline},
          phone = ${phone},
          email = ${email},
          gstin = ${gstin},
          address_line1 = ${address_line1},
          address_line2 = ${address_line2},
          city = ${city},
          state = ${state},
          pincode = ${pincode},
          currency_symbol = ${currency_symbol},
          terms_and_conditions = ${terms_and_conditions},
          whatsapp_number = ${whatsapp_number},
          instagram_id = ${instagram_id},
          pan_number = ${pan_number},
          bank_details = ${bank_details},
          invoice_prefix = ${invoice_prefix},
          invoice_footer = ${invoice_footer},
          gemini_api_key = ${gemini_api_key}
        WHERE id = 1
      `;

      return NextResponse.json({ success: true, message: 'Profile updated successfully' });

    } else if (action === 'save_attribute_def') {
      const { id, name, type, required = 0, options = '[]' } = attributeDef;
      if (!name || !type) {
        return NextResponse.json({ error: 'Attribute name and type are required' }, { status: 400 });
      }

      if (id) {
        // Edit existing def
        await sql`
          UPDATE product_attribute_defs
          SET name = ${name}, type = ${type}, required = ${Number(required)}, options = ${options}
          WHERE id = ${id}
        `;
      } else {
        // Create new def
        await sql`
          INSERT INTO product_attribute_defs (name, type, required, options, business_id)
          VALUES (${name}, ${type}, ${Number(required)}, ${options}, 1)
        `;
      }
      return NextResponse.json({ success: true, message: 'Custom attribute configuration saved' });

    } else if (action === 'delete_attribute_def') {
      if (!deleteDefId) {
        return NextResponse.json({ error: 'Def ID is required' }, { status: 400 });
      }
      await sql`DELETE FROM product_attribute_defs WHERE id = ${deleteDefId}`;
      return NextResponse.json({ success: true, message: 'Custom attribute configuration deleted' });

    } else if (action === 'save_category') {
      const { id, name, sort_order = 0 } = categoryData;
      if (!name) {
        return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
      }

      if (id) {
        await sql`
          UPDATE custom_categories
          SET name = ${name}, sort_order = ${Number(sort_order)}
          WHERE id = ${id}
        `;
      } else {
        await sql`
          INSERT INTO custom_categories (name, sort_order, is_active)
          VALUES (${name}, ${Number(sort_order)}, 1)
        `;
      }
      return NextResponse.json({ success: true, message: 'Product category saved' });

    } else if (action === 'delete_category') {
      if (!deleteCatId) {
        return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
      }
      await sql`DELETE FROM custom_categories WHERE id = ${deleteCatId}`;
      return NextResponse.json({ success: true, message: 'Product category deleted' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (e) {
    console.error('Settings POST error:', e);
    return NextResponse.json({ error: 'Failed to update settings: ' + e.message }, { status: 500 });
  }
}
