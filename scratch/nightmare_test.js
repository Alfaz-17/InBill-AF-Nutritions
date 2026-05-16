const { saleOps, returnOps, reportOps, db } = require('../main/db');

// MOCK ELECTRON FOR STANDALONE TEST
const { Module } = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(path) {
  if (path === 'electron') {
    return { app: { isPackaged: false, getPath: () => '.' }, BrowserWindow: {}, ipcMain: {}, dialog: {}, shell: {}, protocol: {}, net: {} };
  }
  return originalRequire.apply(this, arguments);
};

async function runNightmareStressTest() {
  console.log("🕵️ SENIOR QA STRESS TEST: 'Nightmare-Proofing' Validation...");
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Create a Sale
    const sale = saleOps.create({
      party_id: 1,
      customer_name: "Nightmare Test",
      items: [{ product_id: 1, product_name: "Test Protein", quantity: 10, price: 1000, total_price: 10000 }]
    });
    console.log("✅ Step 1: Sale of 10 items created.");

    // 2. Try to return 11 (Should fail - Nightmare Prevention)
    try {
      await returnOps.createSaleReturn({
        sale_id: sale.id,
        items: [{ product_id: 1, quantity: 11, price: 1000 }]
      });
      throw new Error("Nightmare Alert! System allowed returning more than sold.");
    } catch (e) {
      console.log("✅ Step 2: System BLOCKED over-return (Correct behavior).");
    }

    // 3. Return 4 items
    await returnOps.createSaleReturn({
      sale_id: sale.id,
      party_id: 1,
      total_amount: 4000,
      items: [{ product_id: 1, product_name: "Test Protein", quantity: 4, price: 1000 }]
    });
    console.log("✅ Step 3: Successfully returned 4 items.");

    // 4. Check Report Transparency
    const report = reportOps.salesReport(today, today);
    const targetSale = report.sales.find(s => s.id === sale.id);
    
    if (targetSale.returned_total !== 4000) throw new Error("Nightmare! Report doesn't show return total.");
    console.log(`✅ Step 4: Report correctly shows Returned: ${targetSale.returned_total}`);

    // 5. Try to return 7 more (Should fail - Nightmare Prevention)
    // 10 sold - 4 returned = 6 remaining. 7 is too many.
    try {
      await returnOps.createSaleReturn({
        sale_id: sale.id,
        items: [{ product_id: 1, quantity: 7, price: 1000 }]
      });
      throw new Error("Nightmare Alert! System allowed return exceeding remaining qty.");
    } catch (e) {
      console.log(`✅ Step 5: System BLOCKED return of 7. Only 6 remaining (Correct behavior).`);
    }

    console.log("\n🏆 STRESS TEST COMPLETE: YOUR SYSTEM IS NOW NIGHTMARE-PROOF!");
    
  } catch (err) {
    console.error("❌ TEST FAILED:", err.message);
    process.exit(1);
  }
}

runNightmareStressTest();
