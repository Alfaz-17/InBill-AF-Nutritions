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
    
    // Select active products
    const products = await sql`
      SELECT * FROM products 
      WHERE (is_deleted IS NULL OR is_deleted = 0)
      ORDER BY product_name ASC
    `;
    
    return NextResponse.json(products);
  } catch (e) {
    console.error('Inventory GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch inventory: ' + e.message }, { status: 500 });
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
    const product = await req.json();

    const {
      id,
      product_name,
      brand = '',
      category = '',
      unit = 'pcs',
      mrp = 0,
      selling_price = 0,
      cost_price = 0,
      barcode = '',
      gst_rate = 0,
      cgst = 0,
      sgst = 0,
      quantity = 0,
      batch_number = '',
      expiry_date = '',
      product_size = '',
      min_stock_alert = 0,
      custom_fields = '{}'
    } = product;

    if (!product_name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    // Convert custom_fields to string if it is an object
    const customFieldsStr = typeof custom_fields === 'object' ? JSON.stringify(custom_fields) : custom_fields;

    if (id) {
      // Update existing product
      await sql`
        UPDATE products SET
          product_name = ${product_name},
          brand = ${brand},
          category = ${category},
          unit = ${unit},
          mrp = ${mrp},
          selling_price = ${selling_price},
          cost_price = ${cost_price},
          barcode = ${barcode},
          gst_rate = ${gst_rate},
          cgst = ${cgst},
          sgst = ${sgst},
          quantity = ${quantity},
          batch_number = ${batch_number},
          expiry_date = ${expiry_date},
          product_size = ${product_size},
          min_stock_alert = ${min_stock_alert},
          custom_fields = ${customFieldsStr}
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, message: 'Product updated successfully' });
    } else {
      // Add new product
      const res = await sql`
        INSERT INTO products (
          product_name, brand, category, unit, mrp, selling_price, cost_price,
          barcode, gst_rate, cgst, sgst, quantity, batch_number, expiry_date,
          product_size, min_stock_alert, custom_fields, is_deleted
        ) VALUES (
          ${product_name}, ${brand}, ${category}, ${unit}, ${mrp}, ${selling_price}, ${cost_price},
          ${barcode}, ${gst_rate}, ${cgst}, ${sgst}, ${quantity}, ${batch_number}, ${expiry_date},
          ${product_size}, ${min_stock_alert}, ${customFieldsStr}, 0
        ) RETURNING id
      `;
      return NextResponse.json({ success: true, id: res[0].id, message: 'Product added successfully' });
    }
  } catch (e) {
    console.error('Inventory POST error:', e);
    return NextResponse.json({ error: 'Failed to save product: ' + e.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Soft delete product by setting is_deleted = 1
    await sql`UPDATE products SET is_deleted = 1 WHERE id = ${id}`;

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (e) {
    console.error('Inventory DELETE error:', e);
    return NextResponse.json({ error: 'Failed to delete product: ' + e.message }, { status: 500 });
  }
}
