const path = require('path');
const fs = require('fs/promises');
const os = require('os');

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'inbill-test-'));
  console.log("Temp database path:", path.join(tempRoot, 'store.db'));
  process.env.INBILL_DB_PATH = path.join(tempRoot, 'store.db');
  
  const db = require('../main/db.js');
  console.log("DB required. open status:", db.db?.open);
  
  try {
    console.log("Calling initDB()...");
    db.initDB();
    console.log("initDB() finished.");
    
    console.log("Calling resetDB() WITHOUT await...");
    db.resetDB();
    console.log("resetDB() called (not awaited).");
    
    console.log("Calling businessProfileOps.update()...");
    await db.businessProfileOps.update({
      business_name: 'E2E Production Store',
      business_short: 'E2E',
      tagline: 'Production readiness checks',
    });
    console.log("businessProfileOps.update() finished successfully!");
  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    db.closeDB();
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main();
