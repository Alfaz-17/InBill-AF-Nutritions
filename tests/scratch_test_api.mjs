import assert from 'node:assert/strict';

async function testApi() {
  const url = 'http://localhost:3456/api/db';
  const dbUrl = 'postgresql://postgres.svmsbnknyyegkcrzivhx:Alfaz.78600@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

  console.log('🚀 Sending test request to local dev server in Web/Postgres mode...');
  
  // Test stats:dashboard
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

    console.log('Response status:', res.status);
    const body = await res.json();
    if (!res.ok) {
      console.error('❌ stats:dashboard failed:', body);
      process.exit(1);
    }
    
    console.log('✅ stats:dashboard successfully returned payload!');
    console.log('Stats keys:', Object.keys(body.result));
    console.log('Recent Sales count:', body.result.recentSales?.length);
    console.log('Payment Reminders count:', body.result.paymentReminders?.length);
    
    // Validate returned structure
    assert.ok(body.result.recentSales !== undefined, 'recentSales should be defined');
    assert.ok(body.result.paymentReminders !== undefined, 'paymentReminders should be defined');
  } catch (err) {
    console.error('❌ Connection or parsing error during stats:dashboard request:', err);
    process.exit(1);
  }

  // Test products:getAll
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-neon-url': dbUrl
      },
      body: JSON.stringify({
        channel: 'products:getAll',
        args: []
      })
    });

    console.log('Response status for products:getAll:', res.status);
    const body = await res.json();
    if (!res.ok) {
      console.error('❌ products:getAll failed:', body);
      process.exit(1);
    }
    console.log('✅ products:getAll successfully returned:', body.result.length, 'products');
  } catch (err) {
    console.error('❌ Error during products:getAll request:', err);
    process.exit(1);
  }

  // Test parties:getAll
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-neon-url': dbUrl
      },
      body: JSON.stringify({
        channel: 'parties:getAll',
        args: []
      })
    });

    console.log('Response status for parties:getAll:', res.status);
    const body = await res.json();
    if (!res.ok) {
      console.error('❌ parties:getAll failed:', body);
      process.exit(1);
    }
    console.log('✅ parties:getAll successfully returned:', body.result.length, 'parties');
  } catch (err) {
    console.error('❌ Error during parties:getAll request:', err);
    process.exit(1);
  }

  console.log('🎉 All live Web/Postgres API integration checks passed successfully!');
}

testApi();
