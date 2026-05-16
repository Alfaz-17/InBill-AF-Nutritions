import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'inbill-financial-integrity-'));
const originalDbPath = process.env.INBILL_DB_PATH;

const today = new Date().toISOString().slice(0, 10);
const lastMonth = new Date();
lastMonth.setMonth(lastMonth.getMonth() - 1);
const lastMonthDate = lastMonth.toISOString().slice(0, 10);

let dbModule;

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function setupFresh() {
  dbModule.resetDB();
}

function addParty(name, type = 'Customer', opening_balance = 0) {
  return dbModule.partyOps.add({ name, type, opening_balance }).id;
}

function addProduct(product_name, quantity, selling_price, cost_price) {
  return Number(dbModule.productOps.add({
    product_name,
    quantity,
    selling_price,
    cost_price,
  }).lastInsertRowid);
}

try {
  process.env.INBILL_DB_PATH = path.join(tempRoot, 'store.db');
  dbModule = require(path.join(root, 'main/db.js'));

  const {
    initDB,
    resetDB,
    productOps,
    saleOps,
    purchaseOps,
    statsOps,
    reportOps,
    partyOps,
    returnOps,
    db,
  } = dbModule;

  initDB();
  resetDB();

  setupFresh();
  {
    const customerId = addParty('Integrity Partial Customer');
    const productId = addProduct('Integrity Full Return Item', 1, 1000, 700);

    const sale = await saleOps.create({
      party_id: customerId,
      customer_name: 'Integrity Partial Customer',
      payment_mode: 'Cash',
      paid_amount: 400,
      tax_mode: 'exclusive',
      items: [{ product_id: productId, product_name: 'Integrity Full Return Item', quantity: 1, price: 1000, gst_rate: 0 }],
    });

    let dashboard = statsOps.getDashboard();
    assert.equal(money(dashboard.todayCash), 400, 'partial cash sale increases today cash by paid amount only');
    assert.equal(money(dashboard.todayCredit), 600, 'partial cash sale records only unpaid amount as today credit');
    assert.equal(money(partyOps.getById(customerId).current_balance), 600, 'customer ledger carries the unpaid debt');

    const saleReturn = returnOps.createSaleReturn({
      sale_id: sale.id,
      party_id: customerId,
      payment_mode: 'Cash',
      total_amount: 1000,
      reason: 'Full smart return',
      items: [{ product_id: productId, product_name: 'Integrity Full Return Item', quantity: 1, price: 1000 }],
    });

    const returnRow = db.prepare('SELECT * FROM returns WHERE id = ?').get(saleReturn.returnId);
    dashboard = statsOps.getDashboard();
    assert.equal(money(returnRow.debt_cleared_amount), 600, 'return clears unpaid sale debt first');
    assert.equal(money(returnRow.refund_amount), 400, 'cash refund is limited to the amount actually paid');
    assert.equal(money(partyOps.getById(customerId).current_balance), 0, 'customer debt disappears after full return');
    assert.equal(money(dashboard.todayCash), 0, 'today cash only reverses the paid portion of the sale');
    assert.equal(productOps.getById(productId).quantity, 1, 'sales return restores one unit to stock');
    assert.equal(dashboard.todaySalesCount, 1, 'bill count remains stable after a sales return');
  }

  setupFresh();
  {
    const supplierId = addParty('Integrity Supplier', 'Supplier');
    const purchase = await purchaseOps.create({
      party_id: supplierId,
      supplier_name: 'Integrity Supplier',
      paid_amount: 0,
      items: [{ product_name: 'Integrity Purchase Item', quantity: 10, price: 100, selling_price: 150, mrp: 150 }],
    });
    const product = productOps.getAll().find((item) => item.product_name === 'Integrity Purchase Item');

    assert.equal(money(statsOps.getDashboard().inventoryValue), 1000, 'purchase investment is tracked at cost');
    assert.equal(money(partyOps.getById(supplierId).current_balance), -1000, 'supplier credit purchase creates payable balance');

    returnOps.createPurchaseReturn({
      purchase_id: purchase.purchaseId,
      party_id: supplierId,
      payment_mode: 'Credit',
      total_amount: 500,
      reason: 'Supplier reconciliation',
      items: [{ product_id: product.id, product_name: product.product_name, quantity: 5, price: 100 }],
    });

    assert.equal(productOps.getById(product.id).quantity, 5, 'purchase return removes returned units from stock');
    assert.equal(money(partyOps.getById(supplierId).current_balance), -500, 'supplier payable decreases after purchase return');
    assert.equal(
      partyOps.getLedger(supplierId).some((entry) => entry.type === 'Purchase Return' && money(entry.total_amount) === 500),
      true,
      'supplier ledger records the purchase return credit history',
    );
  }

  setupFresh();
  {
    const customerId = addParty('Customer A');
    const productId = addProduct('Integrity Ghost Sale Item', 1, 200, 120);
    const sale = await saleOps.create({
      party_id: customerId,
      customer_name: 'Customer A',
      paid_amount: 0,
      tax_mode: 'exclusive',
      items: [{ product_id: productId, product_name: 'Integrity Ghost Sale Item', quantity: 1, price: 200, gst_rate: 0 }],
    });

    assert.equal(money(partyOps.getById(customerId).current_balance), 200, 'setup sale creates a customer receivable');
    partyOps.delete(customerId);

    assert.equal(partyOps.getAll('Customer').some((party) => party.id === customerId), false, 'soft-deleted customer is hidden from active parties');
    assert.equal(saleOps.getById(sale.id).customer_name, 'Customer A', 'historical invoice still resolves the deleted party name');
    assert.equal(reportOps.salesReport(today, today).sales.some((row) => row.id === sale.id && row.customer_name === 'Customer A'), true, 'reports preserve historical customer names');
    assert.equal(money(statsOps.getDashboard().receivable), 0, 'deleted party balance is excluded from active pending due');
  }

  setupFresh();
  {
    const customerId = addParty('Integrity Cross Month Customer');
    const productId = addProduct('Integrity Cross Month Item', 1, 1000, 650);
    const sale = await saleOps.create({
      party_id: customerId,
      customer_name: 'Integrity Cross Month Customer',
      paid_amount: 0,
      tax_mode: 'exclusive',
      items: [{ product_id: productId, product_name: 'Integrity Cross Month Item', quantity: 1, price: 1000, gst_rate: 0 }],
    });
    db.prepare('UPDATE sales SET date = ? WHERE id = ?').run(`${lastMonthDate} 10:00:00`, sale.id);

    returnOps.createSaleReturn({
      sale_id: sale.id,
      party_id: customerId,
      payment_mode: 'Credit',
      total_amount: 1000,
      reason: 'Cross-month return',
      items: [{ product_id: productId, product_name: 'Integrity Cross Month Item', quantity: 1, price: 1000 }],
    });

    const todayReport = reportOps.salesReport(today, today);
    assert.equal(money(todayReport.summary.gross_margin), -350, 'today profit decreases by today return margin even when original sale is last month');
    assert.equal(productOps.getById(productId).quantity, 1, 'cross-month return increases stock today');
    assert.equal(money(partyOps.getById(customerId).current_balance), 0, 'cross-month return clears current party balance today');
  }

  console.log('Financial integrity ripple checks passed');
} finally {
  dbModule?.closeDB?.();
  if (originalDbPath === undefined) {
    delete process.env.INBILL_DB_PATH;
  } else {
    process.env.INBILL_DB_PATH = originalDbPath;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
}
