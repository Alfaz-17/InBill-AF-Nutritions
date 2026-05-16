import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'inbill-prod-e2e-'));
const originalDbPath = process.env.INBILL_DB_PATH;

function expectThrows(fn, pattern, message) {
  assert.throws(fn, pattern, message);
}

function byName(products, productName) {
  return products.find((product) => product.product_name === productName);
}

function stockValue(products) {
  return products.reduce((sum, product) => sum + (Number(product.quantity || 0) * Number(product.cost_price || 0)), 0);
}

let db;

try {
  process.env.INBILL_DB_PATH = path.join(tempRoot, 'store.db');
  db = require(path.join(root, 'main/db.js'));

  const {
    initDB,
    resetDB,
    productOps,
    saleOps,
    purchaseOps,
    statsOps,
    reportOps,
    expenseOps,
    partyOps,
    returnOps,
    businessProfileOps,
    categoryOps,
    attributeOps,
    storageOps,
    authOps,
  } = db;

  initDB();
  resetDB();

  businessProfileOps.update({
    business_name: 'E2E Production Store',
    business_short: 'E2E',
    tagline: 'Production readiness checks',
    address_line1: 'QA Road',
    address_line2: '',
    city: 'Pune',
    state: 'MH',
    pincode: '411001',
    phone: '9999999999',
    email: 'qa@example.com',
    gstin: '27ABCDE1234F1Z5',
    logo_path: '',
    invoice_prefix: 'E2E',
    invoice_footer: 'Checked by QA',
    currency_symbol: 'Rs. ',
    business_type: 'Supplement Store',
    invoice_settings: { template: 'modern' },
    master_data: { delete_pin: '1234', tax_rates: [0, 5, 18], units: ['pcs', 'jar'] },
    bank_details: '',
    whatsapp_settings: {},
  });

  authOps.setPassword('1234');
  assert.equal(authOps.verify('1234'), true, 'security PIN verifies correct password');
  assert.equal(authOps.verify('0000'), false, 'security PIN rejects wrong password');

  categoryOps.add('Protein');
  attributeOps.add({ name: 'Size', type: 'text', required: 0 });

  const customerInfo = partyOps.add({
    name: 'E2E Customer',
    phone: '9111111111',
    type: 'Customer',
    opening_balance: 100,
  });
  const supplierInfo = partyOps.add({
    name: 'E2E Supplier',
    phone: '9222222222',
    type: 'Supplier',
    opening_balance: 0,
  });
  const customerId = customerInfo.id;
  const supplierId = supplierInfo.id;

  const added = productOps.add({
    product_name: 'E2E Whey',
    brand: 'ProFuel',
    category: 'Protein',
    product_size: '2kg',
    unit: 'jar',
    mrp: 999,
    selling_price: 750,
    cost_price: 500,
    barcode: 'E2E-WHEY-001',
    gst_rate: 18,
    cgst: 9,
    sgst: 9,
    quantity: 10,
    min_stock_alert: 10,
    batch_number: 'B1',
    expiry_date: '2027-12-31',
    custom_fields: JSON.stringify({ Size: '2kg' }),
  });
  const wheyId = Number(added.lastInsertRowid);

  expectThrows(
    () => productOps.add({
      product_name: 'Duplicate Barcode',
      selling_price: 1,
      cost_price: 1,
      quantity: 1,
      barcode: 'E2E-WHEY-001',
    }),
    /already assigned/,
    'duplicate barcode must be blocked',
  );

  let whey = productOps.getById(wheyId);
  assert.equal(whey.gst_rate, 18, 'GST persists on product');
  assert.equal(whey.mrp, 999, 'MRP persists on product');
  assert.equal(whey.cost_price, 500, 'cost price persists on product');
  assert.equal(whey.min_stock_alert, 10, 'min stock alert persists on product');
  assert.equal(JSON.parse(whey.custom_fields).Size, '2kg', 'custom Size attribute persists');

  let dashboard = statsOps.getDashboard();
  assert.equal(stockValue(reportOps.stockReport()), 5000, 'stock report inventory value uses stock at cost');
  assert.equal(dashboard.lowStock.some((item) => item.id === wheyId), true, 'Restock Radar receives low-stock rows');

  productOps.update(wheyId, {
    ...whey,
    quantity: 5,
    min_stock_alert: 10,
    custom_fields: whey.custom_fields,
  });
  assert.equal(stockValue(reportOps.stockReport()), 2500, 'manual stock adjustment updates report inventory value');

  await assert.rejects(
    () => saleOps.create({
      customer_name: 'Overflow',
      items: [{ product_id: wheyId, product_name: 'E2E Whey', quantity: 99, price: 750, gst_rate: 0 }],
    }),
    /Insufficient stock/,
    'backend blocks sales that would leak stock below zero',
  );

  const cashSale = await saleOps.create({
    customer_name: 'Counter Sale',
    payment_mode: 'Cash',
    paid_amount: 750,
    tax_mode: 'exclusive',
    items: [{ product_id: wheyId, product_name: 'E2E Whey', quantity: 1, price: 750, gst_rate: 0, mrp: 999 }],
  });
  assert.equal(cashSale.total_amount, 750, 'cash sale has zero due total');
  assert.equal(productOps.getById(wheyId).quantity, 4, 'cash sale reduces stock');

  const creditSale = await saleOps.create({
    party_id: customerId,
    customer_name: 'E2E Customer',
    payment_mode: 'Cash',
    paid_amount: 500,
    tax_mode: 'exclusive',
    items: [{ product_id: wheyId, product_name: 'E2E Whey', quantity: 2, price: 750, gst_rate: 0, mrp: 999 }],
  });
  assert.equal(creditSale.due_amount, 1000, 'credit sale records due amount');
  assert.equal(productOps.getById(wheyId).quantity, 2, 'credit sale reduces stock');
  assert.equal(partyOps.getById(customerId).current_balance, 1100, 'customer balance includes opening balance and credit sale');

  expectThrows(
    () => partyOps.recordPayment({ party_id: customerId, amount: 2000, payment_mode: 'Cash', note: 'too much' }),
    /Payment exceeds outstanding receivable/,
    'customer collection cannot exceed receivable',
  );
  partyOps.recordPayment({ party_id: customerId, amount: 300, payment_mode: 'UPI', note: 'digital receipt' });
  assert.equal(partyOps.getById(customerId).current_balance, 800, 'digital collection reduces customer receivable');

  const saleReturn = returnOps.createSaleReturn({
    sale_id: creditSale.id,
    party_id: customerId,
    total_amount: 750,
    reason: 'Customer return',
    items: [{ product_id: wheyId, product_name: 'E2E Whey', quantity: 1, price: 750 }],
  });
  assert.equal(saleReturn.success, true, 'sales return succeeds');
  assert.equal(productOps.getById(wheyId).quantity, 3, 'sales return rolls stock back');
  assert.equal(partyOps.getById(customerId).current_balance, 50, 'credit return reduces customer balance');
  assert.equal(saleOps.getById(creditSale.id).returned_total, 750, 'sale tracks returned total');
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(reportOps.salesReport(today, today).summary.profit, 500, 'sales return reduces report profit before undo');

  expectThrows(
    () => returnOps.createSaleReturn({
      sale_id: creditSale.id,
      party_id: customerId,
      total_amount: 1500,
      reason: 'Too much',
      items: [{ product_id: wheyId, product_name: 'E2E Whey', quantity: 2, price: 750 }],
    }),
    /Only 1 remaining/,
    'sales return cannot exceed remaining returnable quantity',
  );

  returnOps.deleteSaleReturn(saleReturn.returnId);
  assert.equal(productOps.getById(wheyId).quantity, 2, 'undo sales return removes returned stock');
  assert.equal(partyOps.getById(customerId).current_balance, 800, 'undo sales return restores customer balance');
  assert.equal(saleOps.getById(creditSale.id).returned_total, 0, 'undo sales return restores invoice net value');

  const purchase = await purchaseOps.create({
    party_id: supplierId,
    supplier_name: 'E2E Supplier',
    paid_amount: 600,
    other_charges: 0,
    items: [{
      product_name: 'E2E Creatine',
      category: 'Performance',
      product_size: '250g',
      quantity: 5,
      price: 300,
      mrp: 499,
      selling_price: 450,
      gst_rate: 5,
      custom_fields: { Size: '250g' },
    }],
  });
  const creatine = byName(productOps.getAll(), 'E2E Creatine');
  assert.equal(purchase.createdCount, 1, 'purchase auto-creates new inventory item');
  assert.equal(creatine.quantity, 5, 'purchase stocks created item');
  assert.equal(partyOps.getById(supplierId).current_balance, -900, 'credit purchase increases payable');

  const purchaseReturn = returnOps.createPurchaseReturn({
    purchase_id: purchase.purchaseId,
    party_id: supplierId,
    total_amount: 600,
    reason: 'Supplier return',
    items: [{ product_id: creatine.id, product_name: 'E2E Creatine', quantity: 2, price: 300 }],
  });
  assert.equal(purchaseReturn.success, true, 'purchase return succeeds');
  assert.equal(productOps.getById(creatine.id).quantity, 3, 'purchase return reduces stock');
  assert.equal(partyOps.getById(supplierId).current_balance, -300, 'purchase return reduces payable');

  returnOps.deletePurchaseReturn(purchaseReturn.pReturnId);
  assert.equal(productOps.getById(creatine.id).quantity, 5, 'undo purchase return restores stock');
  assert.equal(partyOps.getById(supplierId).current_balance, -900, 'undo purchase return restores payable');

  expectThrows(
    () => partyOps.recordPayment({ party_id: supplierId, amount: 2000, payment_mode: 'Cash', note: 'too much' }),
    /Payment exceeds outstanding payable/,
    'supplier payment cannot exceed payable',
  );
  partyOps.recordPayment({ party_id: supplierId, amount: 500, payment_mode: 'Cash', note: 'supplier payment' });
  assert.equal(partyOps.getById(supplierId).current_balance, -400, 'supplier payment decreases payable');

  expenseOps.add({ category: 'Tea/Coffee', description: 'QA expense', amount: 50 });

  dashboard = statsOps.getDashboard();
  assert.equal(dashboard.todayCash, 1250, 'today cash includes cash sales and excludes digital collections');
  assert.equal(dashboard.todayDigital, 300, 'today digital includes UPI party collection');
  assert.equal(dashboard.receivable, 800, 'dashboard receivable reflects current customer balance');
  assert.equal(dashboard.payable, 400, 'dashboard payable reflects current supplier balance');
  assert.equal(reportOps.salesReport(today, today).summary.profit, 700, 'report profit uses sales margin, undone returns, and expenses');

  const salesReport = reportOps.salesReport(today, today);
  const purchaseReport = reportOps.purchaseReport(today, today);
  const stockReport = reportOps.stockReport();
  assert.equal(salesReport.summary.total, 2250, 'sales report shows net sales total');
  assert.equal(salesReport.summary.returns, 0, 'sales report reflects undone return state');
  assert.equal(purchaseReport.summary.total, 1500, 'purchase report shows net purchases');
  assert.equal(stockReport.some((item) => item.product_name === 'E2E Creatine' && item.quantity === 5), true, 'stock report reflects current inventory');

  productOps.delete(wheyId);
  assert.equal(productOps.getAll().some((item) => item.id === wheyId), false, 'deleted product disappears from active inventory and billing');
  assert.equal(saleOps.getById(cashSale.id).items.some((item) => item.product_name === 'E2E Whey'), true, 'deleted product remains in historical invoice items');

  const exported = storageOps.exportAll();
  assert.ok(Array.isArray(exported.returns), 'backup export includes sales returns table');
  assert.ok(Array.isArray(exported.purchase_returns), 'backup export includes purchase returns table');
  assert.equal(exported.products.some((item) => item.product_name === 'E2E Creatine'), true, 'backup export includes products');

  resetDB();
  assert.equal(productOps.getAll().length, 0, 'reset clears inventory before restore');
  storageOps.importAll(exported);
  assert.equal(productOps.getAll().some((item) => item.product_name === 'E2E Creatine'), true, 'backup import restores product data');
  assert.equal(saleOps.getById(cashSale.id).items.length, 1, 'backup import restores sale item data');
  assert.equal(partyOps.getById(supplierId).current_balance, -400, 'backup import restores ledger balances');

  console.log('Production E2E core flow checks passed');
} finally {
  db?.closeDB?.();
  if (originalDbPath === undefined) {
    delete process.env.INBILL_DB_PATH;
  } else {
    process.env.INBILL_DB_PATH = originalDbPath;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
}
