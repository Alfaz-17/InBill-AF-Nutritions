const postgres = require('postgres');

const url6543 = 'postgresql://postgres.svmsbnknyyegkcrzivhx:Alfaz.78600@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
const url5432 = 'postgresql://postgres.svmsbnknyyegkcrzivhx:Alfaz.78600@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';

async function testConnection(label, url) {
  console.log(`⚡ Testing connection on ${label}...`);
  const sql = postgres(url, {
    ssl: { rejectUnauthorized: false },
    connect_timeout: 8
  });
  
  try {
    const res = await sql`SELECT version()`;
    console.log(`✅ SUCCESS on ${label}! Connected successfully.`);
    console.log(`Database version: ${res[0].version}`);
    return true;
  } catch (err) {
    console.error(`❌ FAILED on ${label}: ${err.message}`);
    return false;
  } finally {
    await sql.end();
  }
}

async function run() {
  const success6543 = await testConnection("Port 6543 (Transaction Mode Pooler)", url6543);
  const success5432 = await testConnection("Port 5432 (Session Mode Pooler)", url5432);
  
  if (!success6543 && !success5432) {
    console.log("\n⚠️ Both ports failed. This usually means either:");
    console.log("1. The password 'Alfaz.78600' is incorrect (please double check it).");
    console.log("2. The local network or ISP blocks ports 6543 and 5432 to external servers.");
    console.log("3. The Supabase pooler is not enabled for this project.");
  }
}

run();
