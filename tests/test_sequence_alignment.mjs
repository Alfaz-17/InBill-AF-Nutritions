async function runSequenceProof() {
  const url = 'http://localhost:3456/api/db';
  const dbUrl = 'postgresql://postgres.svmsbnknyyegkcrzivhx:Alfaz.78600@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

  console.log('🔗 Connecting to local server API...');
  
  // 1. Trigger dynamic connection & sequence self-healing via stats:dashboard
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-neon-url': dbUrl
      },
      body: JSON.stringify({
        channel: 'stats:dashboard',
        args: []
      })
    });
    const body = await res.json();
    if (!res.ok) {
      console.error('❌ stats:dashboard failed:', body);
      process.exit(1);
    }
    console.log('✅ stats:dashboard called successfully. Connection active and sequence self-healing scheduled!');
  } catch (err) {
    console.error('❌ stats:dashboard connection error:', err);
    process.exit(1);
  }

  // Wait 3 seconds to let background schema/sequence verification finish
  console.log('⏳ Waiting for background sequence alignment to complete...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 2. Create a dynamic product first to guarantee positive stock and verify products table sequence identity alignment!
  console.log('📝 Creating a dynamic product to guarantee stock and verify sequence identity alignment...');
  let productId = null;
  const uniqueProductName = `Antigravity Dynamic Product ${Date.now()}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-neon-url': dbUrl
      },
      body: JSON.stringify({
        channel: 'products:add',
        args: [{
          product_name: uniqueProductName,
          brand: 'Antigravity',
          category: 'Test',
          quantity: 10,
          selling_price: 100,
          cost_price: 50,
          mrp: 100,
          gst_rate: 0
        }]
      })
    });
    const body = await res.json();
    if (!res.ok) {
      console.error('❌ Product creation failed:', body);
      process.exit(1);
    }
    productId = body.result.lastInsertRowid;
    console.log(`✅ Product created successfully! ID: ${productId}, Name: ${uniqueProductName}`);
  } catch (err) {
    console.error('❌ Error during product creation:', err);
    process.exit(1);
  }

  // 3. Perform a sales:create insert to verify sequence mismatch is fully fixed!
  console.log('📝 Attempting to insert a new transaction (Sales Record)...');
  try {
    const saleData = {
      tax_mode: 'exclusive',
      party_id: null,
      customer_name: 'Antigravity Test Customer',
      customer_phone: '1234567890',
      customer_address: '',
      misc_charges: 0,
      paid_amount: 100,
      payment_mode: 'Cash',
      credit_days: 0,
      items: [
        {
          product_id: productId,
          product_name: uniqueProductName,
          quantity: 1,
          price: 100,
          mrp: 100,
          gst_rate: 0
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-neon-url': dbUrl
      },
      body: JSON.stringify({
        channel: 'sales:create',
        args: [saleData]
      })
    });
    const body = await res.json();
    if (!res.ok) {
      console.error('❌ Transaction creation failed:', body);
      process.exit(1);
    }
    console.log('🎉 SUCCESS! sales:create executed perfectly without any duplicate key or constraint errors!');
    console.log('Inserted Sale details:', {
      id: body.result.id,
      invoice_number: body.result.invoice_number,
      customer_name: body.result.customer_name,
      total_amount: body.result.total_amount
    });
  } catch (err) {
    console.error('❌ Error while inserting sales record:', err);
    process.exit(1);
  }
}

runSequenceProof();
