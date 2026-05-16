// MOCK ELECTRON FOR STANDALONE TEST
const { Module } = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(path) {
  if (path === 'electron') {
    return { 
      app: { isPackaged: false, getPath: () => '.' },
      BrowserWindow: {}, ipcMain: {}, dialog: {}, shell: {}, protocol: {}, net: {} 
    };
  }
  return originalRequire.apply(this, arguments);
};

const { productOps, saleOps, returnOps, reportOps, partyOps, db, initDB } = require('../main/db');

async function runQATest() {
  console.log("🚀 STARTING SENIOR QA VALIDATION (End-to-End)...");
  
  try {
    // 1. Setup Test Data
    const party = partyOps.add({ name: "QA Test Customer", type: "Customer", opening_balance: 0 });
    const partyId = party.lastInsertRowid;
    
    const product = productOps.add({ 
      product_name: "QA Test Protein", 
      quantity: 100, 
      selling_price: 1000, 
      cost_price: 600 
    });
    const productId = product.lastInsertRowid;
    console.log("✅ Step 1: Initialized Test Product (Stock: 100) and Party.");

    // 2. Perform a Sale
    const saleData = {
      party_id: partyId,
      customer_name: "QA Test Customer",
      paid_amount: 0, // Full credit sale
      items: [{
        product_id: productId,
        product_name: "QA Test Protein",
        quantity: 10,
        price: 1000,
        total_price: 10000
      }]
    };
    const sale = saleOps.create(saleData);
    console.log("✅ Step 2: Performed Sale of 10 items. Stock should be 90.");
    
    const productAfterSale = db.prepare('SELECT quantity FROM products WHERE id = ?').get(productId);
    const partyAfterSale = db.prepare('SELECT current_balance FROM parties WHERE id = ?').get(partyId);
    
    if (productAfterSale.quantity !== 90) throw new Error(`Stock Fail: Expected 90, got ${productAfterSale.quantity}`);
    if (partyAfterSale.current_balance !== 10000) throw new Error(`Balance Fail: Expected 10000, got ${partyAfterSale.current_balance}`);

    // 3. Perform a Sales Return
    console.log("✅ Step 3: Performing Return of 4 items. Stock should become 94.");
    const returnData = {
      sale_id: sale.id,
      party_id: partyId,
      total_amount: 4000, // 4 items * 1000
      reason: "QA Testing",
      items: [{
        product_id: productId,
        product_name: "QA Test Protein",
        quantity: 4,
        price: 1000
      }]
    };
    await returnOps.createSaleReturn(returnData);
    
    const productAfterReturn = db.prepare('SELECT quantity FROM products WHERE id = ?').get(productId);
    const partyAfterReturn = db.prepare('SELECT current_balance FROM parties WHERE id = ?').get(partyId);
    
    if (productAfterReturn.quantity !== 94) throw new Error(`Return Stock Fail: Expected 94, got ${productAfterReturn.quantity}`);
    if (partyAfterReturn.current_balance !== 6000) throw new Error(`Return Balance Fail: Expected 6000, got ${partyAfterReturn.current_balance}`);

    // 4. Check Reports Consistency
    console.log("✅ Step 4: Verifying Sales Report Deductions.");
    const today = new Date().toISOString().split('T')[0];
    const report = reportOps.salesReport(today, today);
    
    // Net Sales should be 6000 (10000 sale - 4000 return)
    if (report.summary.total !== 6000) throw new Error(`Report Fail: Expected Net 6000, got ${report.summary.total}`);
    
    console.log("\n✨ FINAL VERDICT: ALL SYSTEMS PASS!");
    console.log("Summary: Stock rollbacks, Party ledgers, and Report deductions are 100% accurate.");
    
  } catch (err) {
    console.error("❌ QA TEST FAILED:", err.message);
    process.exit(1);
  }
}

runQATest();
