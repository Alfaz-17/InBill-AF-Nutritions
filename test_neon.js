require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

async function testConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL not found in .env.local");
    return;
  }

  console.log("🔌 Connecting to:", url.replace(/:[^:@]+@/, ':****@'));

  const cleanUrl = url.split('?')[0];
  const sql = postgres(cleanUrl, {
    ssl: { rejectUnauthorized: false },
    connect_timeout: 10,
  });

  try {
    const res = await sql`SELECT NOW() as time, current_database() as db, version() as version`;
    console.log("✅ Connected successfully!");
    console.log("   Database:", res[0].db);
    console.log("   Time:", res[0].time);
    console.log("   Version:", res[0].version);
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  } finally {
    await sql.end();
  }
}

testConnection();
