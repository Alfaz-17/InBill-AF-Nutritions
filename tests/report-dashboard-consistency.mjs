import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'inbill-state-consistency-'));
const originalDbPath = process.env.INBILL_DB_PATH;
const today = new Date().toISOString().slice(0, 10);
const monthName = new Date().toLocaleString('en-US', { month: 'short' });

let dbModule;
const scenarios = [];

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function stockValue(rows) {
  return money(rows.reduce((sum, row) => sum + (Number(row.quantity || 0) * Number(row.cost_price || 0)), 0));
}

async function scenario(name, fn) {
  await fn();
  scenarios.push(name);
}

function expectMoney(actual, expected, message) {
  assert.equal(money(actual), money(expected), message);
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
    expenseOps,
    partyOps,
    returnOps,
    db,
  } = dbModule;

  initDB();
  resetDB();

  let dashboard;
  let salesReport;
  let purchaseReport;
  let stockReport;
  let monthlyRow;

  let alphaId;
  let betaId;
  let customerId;
  let supplierId;
  let sale;
  let purchase;

  await scenario('01 setup parties and inventory', async () => {
    customerId = partyOps.add({ name: 'State Customer', type: 'Customer', opening_balance: 0 }).id;
    supplierId = partyOps.add({ name: 'State Supplier', type: 'Supplier', opening_balance: 0 }).id;
    alphaId = Number(productOps.add({
      product_name: 'State Alpha',
      quantity: 10,
      selling_price: 100,
      cost_price: 60,
      min_stock_alert: 10,
    }).lastInsertRowid);

    dashboard = statsOps.getDashboard();
    stockReport = reportOps.stockReport();

    assert.equal(productOps.getById(alphaId).quantity, 10, 'initial product stock persists');
    assert.equal(dashboard.totalProducts, 1, 'dashboard active product count matches setup');
    assert.equal(dashboard.lowStock.some((item) => item.id === alphaId), true, 'dashboard Restock Radar sees active low-stock product');
    assert.equal(Object.hasOwn(dashboard, 'inventoryValue'), false, 'dashboard must not expose stock-cost value');
    assert.equal(Object.hasOwn(dashboard, 'totalProfit'), false, 'dashboard must not expose net profit');
    expectMoney(stockValue(stockReport), 600, 'stock report owns stock-cost value');
  });

  await scenario('02 partial-credit sale updates dashboard, ledger, report, and stock', async () => {
    sale = await saleOps.create({
      party_id: customerId,
      customer_name: 'State Customer',
      payment_mode: 'Cash',
      paid_amount: 200,
      tax_mode: 'exclusive',
      items: [{ product_id: alphaId, product_name: 'State Alpha', quantity: 5, price: 100, gst_rate: 0 }],
    });

    dashboard = statsOps.getDashboard();
    salesReport = reportOps.salesReport(today, today);

    assert.equal(productOps.getById(alphaId).quantity, 5, 'sale reduces stock');
    expectMoney(partyOps.getById(customerId).current_balance, 300, 'sale due reaches customer ledger');
    expectMoney(dashboard.todaySalesTotal, 500, 'dashboard today sales equals sale value');
    expectMoney(dashboard.todayCash, 200, 'dashboard today cash equals paid cash');
    expectMoney(dashboard.todayCredit, 300, 'dashboard today credit equals unpaid amount');
    assert.equal(dashboard.todaySalesCount, 1, 'bill count increments once');
    expectMoney(salesReport.summary.total, 500, 'sales report total matches sale before returns');
    expectMoney(salesReport.summary.cash_received, 200, 'sales report cash received matches paid cash');
  });

  await scenario('03 customer collection reconciles credit without changing revenue', async () => {
    partyOps.recordPayment({ party_id: customerId, amount: 100, payment_mode: 'UPI', note: 'state collection' });

    dashboard = statsOps.getDashboard();
    salesReport = reportOps.salesReport(today, today);

    expectMoney(partyOps.getById(customerId).current_balance, 200, 'customer collection reduces receivable');
    expectMoney(dashboard.todaySalesTotal, 500, 'collection does not change sales revenue');
    expectMoney(dashboard.todayDigital, 100, 'dashboard records digital collection');
    expectMoney(dashboard.todayCredit, 200, 'dashboard credit reflects collection');
    expectMoney(salesReport.summary.total, 500, 'sales report revenue is unchanged by collection');
    expectMoney(salesReport.summary.cash_received, 300, 'sales report cash inflow includes collection');
  });

  await scenario('04 sales return rolls back sales, credit, stock, profit, and reports', async () => {
    const saleReturn = returnOps.createSaleReturn({
      sale_id: sale.id,
      party_id: customerId,
      payment_mode: 'Cash',
      total_amount: 200,
      reason: 'state sales return',
      items: [{ product_id: alphaId, product_name: 'State Alpha', quantity: 2, price: 100 }],
    });
    const returnRow = db.prepare('SELECT * FROM returns WHERE id = ?').get(saleReturn.returnId);

    dashboard = statsOps.getDashboard();
    salesReport = reportOps.salesReport(today, today);

    expectMoney(returnRow.debt_cleared_amount, 200, 'sales return clears remaining debt first');
    expectMoney(returnRow.refund_amount, 0, 'sales return does not refund unpaid money');
    assert.equal(productOps.getById(alphaId).quantity, 7, 'sales return restores stock');
    expectMoney(partyOps.getById(customerId).current_balance, 0, 'sales return clears customer ledger');
    expectMoney(dashboard.todaySalesTotal, 300, 'dashboard today sales is net of return');
    expectMoney(dashboard.todayCash, 200, 'dashboard cash is not reduced when no cash refund happened');
    expectMoney(dashboard.todayDigital, 100, 'dashboard digital collection remains visible');
    expectMoney(dashboard.todayCredit, 0, 'dashboard credit is fully reconciled');
    assert.equal(dashboard.todaySalesCount, 1, 'bill count remains stable after return');
    expectMoney(salesReport.summary.gross_total, 500, 'sales report keeps gross total for audit');
    expectMoney(salesReport.summary.total, 300, 'sales report total is net revenue');
    expectMoney(salesReport.summary.returns, 200, 'sales report returns match return value');
    expectMoney(salesReport.summary.cash_received, 300, 'sales report cash inflow remains paid plus collection');
    expectMoney(salesReport.summary.gross_margin, 120, 'sales report margin is net of returned items');
  });

  await scenario('05 invalid sale, return, and payment actions are blocked', async () => {
    await assert.rejects(
      () => saleOps.create({
        party_id: customerId,
        customer_name: 'State Customer',
        items: [{ product_id: alphaId, product_name: 'State Alpha', quantity: 99, price: 100, gst_rate: 0 }],
      }),
      /Insufficient stock/,
      'overselling is blocked',
    );

    assert.throws(
      () => returnOps.createSaleReturn({
        sale_id: sale.id,
        party_id: customerId,
        total_amount: 400,
        reason: 'too much',
        items: [{ product_id: alphaId, product_name: 'State Alpha', quantity: 4, price: 100 }],
      }),
      /Only 3 remaining/,
      'over-returning is blocked',
    );

    assert.throws(
      () => partyOps.recordPayment({ party_id: customerId, amount: 1, payment_mode: 'Cash', note: 'overpay' }),
      /Payment exceeds outstanding receivable/,
      'customer over-collection is blocked',
    );
  });

  await scenario('06 credit purchase updates supplier payable, stock, and purchase report', async () => {
    purchase = await purchaseOps.create({
      party_id: supplierId,
      supplier_name: 'State Supplier',
      paid_amount: 100,
      items: [{ product_name: 'State Beta', quantity: 10, price: 40, selling_price: 70, mrp: 70 }],
    });
    betaId = productOps.getAll().find((item) => item.product_name === 'State Beta').id;

    dashboard = statsOps.getDashboard();
    purchaseReport = reportOps.purchaseReport(today, today);
    stockReport = reportOps.stockReport();

    assert.equal(productOps.getById(betaId).quantity, 10, 'purchase increases stock');
    expectMoney(partyOps.getById(supplierId).current_balance, -300, 'credit purchase increases supplier payable');
    expectMoney(dashboard.payable, 300, 'dashboard payable matches supplier ledger');
    expectMoney(purchaseReport.summary.total, 400, 'purchase report total matches purchase before returns');
    expectMoney(stockValue(stockReport), 820, 'stock report value includes sale return and purchase stock');
  });

  await scenario('07 purchase return reconciles supplier, stock, dashboard, reports, and monthly stats', async () => {
    returnOps.createPurchaseReturn({
      purchase_id: purchase.purchaseId,
      party_id: supplierId,
      payment_mode: 'Credit',
      total_amount: 160,
      reason: 'state purchase return',
      items: [{ product_id: betaId, product_name: 'State Beta', quantity: 4, price: 40 }],
    });
    partyOps.recordPayment({ party_id: supplierId, amount: 50, payment_mode: 'Cash', note: 'supplier payment' });

    dashboard = statsOps.getDashboard();
    purchaseReport = reportOps.purchaseReport(today, today);
    stockReport = reportOps.stockReport();

    assert.equal(productOps.getById(betaId).quantity, 6, 'purchase return reduces stock');
    expectMoney(partyOps.getById(supplierId).current_balance, -90, 'purchase return and supplier payment reconcile payable');
    expectMoney(dashboard.payable, 90, 'dashboard payable follows supplier ledger');
    expectMoney(purchaseReport.summary.total, 240, 'purchase report is net of purchase returns');
    expectMoney(purchaseReport.summary.returns, 160, 'purchase report returns match purchase return value');
    expectMoney(stockValue(stockReport), 660, 'stock report cost value follows current active stock');
  });

  await scenario('08 expenses and monthly report stats use net sales, net purchases, and profit', async () => {
    expenseOps.add({ category: 'Operations', description: 'state expense', amount: 30 });

    salesReport = reportOps.salesReport(today, today);
    monthlyRow = statsOps.getMonthlyStats().find((row) => row.month === monthName);

    expectMoney(salesReport.summary.total, 300, 'sales report remains net after expense');
    expectMoney(salesReport.summary.expenses, 30, 'sales report includes expenses');
    expectMoney(salesReport.summary.profit, 90, 'sales report net profit is margin minus expense');
    expectMoney(monthlyRow.sales, 300, 'monthly stats sales are net of sales returns');
    expectMoney(monthlyRow.purchases, 240, 'monthly stats purchases are net of purchase returns');
    expectMoney(monthlyRow.expenses, 30, 'monthly stats include expenses');
    expectMoney(monthlyRow.profit, 90, 'monthly stats profit matches sales report profit');
  });

  await scenario('09 soft-deleted parties do not leak active dues but reports keep history', async () => {
    partyOps.delete(customerId);

    dashboard = statsOps.getDashboard();
    salesReport = reportOps.salesReport(today, today);

    assert.equal(partyOps.getAll('Customer').some((party) => party.id === customerId), false, 'soft-deleted customer disappears from active list');
    assert.equal(saleOps.getById(sale.id).customer_name, 'State Customer', 'historical invoice keeps customer name');
    assert.equal(salesReport.sales.some((row) => row.id === sale.id && row.customer_name === 'State Customer'), true, 'sales report keeps historical customer name');
    expectMoney(dashboard.receivable, 0, 'soft-deleted settled customer does not leak into dashboard receivable');
  });

  await scenario('10 soft-deleted products leave active stock reports but keep invoice history', async () => {
    productOps.delete(alphaId);

    dashboard = statsOps.getDashboard();
    stockReport = reportOps.stockReport();

    assert.equal(productOps.getAll().some((product) => product.id === alphaId), false, 'deleted product leaves active inventory');
    assert.equal(stockReport.some((product) => product.id === alphaId), false, 'stock report excludes deleted products from active inventory');
    assert.equal(saleOps.getById(sale.id).items.some((item) => item.product_name === 'State Alpha'), true, 'historical sale keeps deleted product name');
    assert.equal(dashboard.totalProducts, 1, 'dashboard product count excludes deleted product');
    assert.equal(dashboard.lowStock.some((item) => item.id === alphaId), false, 'Restock Radar excludes deleted product');
  });

  await scenario('11 supplier overpayment is blocked and no state changes leak', async () => {
    assert.throws(
      () => partyOps.recordPayment({ party_id: supplierId, amount: 1000, payment_mode: 'Cash', note: 'overpay supplier' }),
      /Payment exceeds outstanding payable/,
      'supplier overpayment is blocked',
    );

    dashboard = statsOps.getDashboard();
    purchaseReport = reportOps.purchaseReport(today, today);

    expectMoney(partyOps.getById(supplierId).current_balance, -90, 'blocked supplier overpayment leaves ledger unchanged');
    expectMoney(dashboard.payable, 90, 'blocked supplier overpayment leaves dashboard unchanged');
    expectMoney(purchaseReport.summary.total, 240, 'blocked supplier overpayment leaves reports unchanged');
  });

  console.log(`Report/dashboard consistency checks passed (${scenarios.length} scenarios)`);
  for (const name of scenarios) console.log(` - ${name}`);
} finally {
  dbModule?.closeDB?.();
  if (originalDbPath === undefined) {
    delete process.env.INBILL_DB_PATH;
  } else {
    process.env.INBILL_DB_PATH = originalDbPath;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
}
