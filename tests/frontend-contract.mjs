import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => fs.readFile(path.join(root, file), 'utf8');

const sources = {
  page: await read('app/page.js'),
  preload: await read('main/preload.js'),
  main: await read('main/main.js'),
  db: await read('main/db.js'),
  dashboard: await read('app/components/Dashboard.js'),
  products: await read('app/components/Products.js'),
  billing: await read('app/components/Billing.js'),
  parties: await read('app/components/Parties.js'),
  purchases: await read('app/components/Purchases.js'),
  reports: await read('app/components/Reports.js'),
  settings: await read('app/components/Settings.js'),
  expenses: await read('app/components/Expenses.js'),
  toastProvider: await read('app/components/ToastProvider.js'),
  invoiceTemplates: await read('app/components/InvoiceTemplates.js'),
};

function includes(source, needle, message) {
  assert.ok(source.includes(needle), message || `Missing ${needle}`);
}

function matches(source, pattern, message) {
  assert.match(source, pattern, message);
}

const preloadChannels = [...sources.preload.matchAll(/ipcRenderer\.invoke\('([^']+)'/g)].map((match) => match[1]);
for (const channel of preloadChannels) {
  includes(sources.main, `ipcMain.handle('${channel}'`, `preload channel ${channel} must have a main-process handler`);
}

const componentApiCalls = new Set();
for (const source of [
  sources.dashboard,
  sources.products,
  sources.billing,
  sources.parties,
  sources.purchases,
  sources.reports,
  sources.settings,
  sources.expenses,
]) {
  for (const match of source.matchAll(/window\.electronAPI(?:\?\.)?\.([A-Za-z0-9_]+)(?:\?\.)?\.([A-Za-z0-9_]+)/g)) {
    componentApiCalls.add(`${match[1]}.${match[2]}`);
  }
}

const expectedApiCalls = [
  'products.getAll',
  'products.add',
  'products.update',
  'products.delete',
  'attributes.getAll',
  'attributes.add',
  'categories.getAll',
  'categories.add',
  'sales.create',
  'sales.getByInvoice',
  'parties.getAll',
  'parties.add',
  'parties.update',
  'parties.delete',
  'parties.getLedger',
  'parties.recordPayment',
  'purchases.create',
  'purchases.getAll',
  'purchases.getById',
  'purchases.delete',
  'returns.createSaleReturn',
  'returns.getAllSaleReturns',
  'returns.deleteSaleReturn',
  'returns.createPurchaseReturn',
  'reports.sales',
  'reports.purchases',
  'reports.stock',
  'stats.dashboard',
  'stats.getMonthly',
  'pdf.generate',
  'pdf.saveAs',
  'storage.exportData',
  'storage.importData',
  'settings.getNeonConfig',
  'settings.setNeonConfig',
  'settings.syncToCloud',
  'business.getProfile',
  'business.updateProfile',
  'auth.setPassword',
];

for (const apiCall of expectedApiCalls) {
  assert.ok(componentApiCalls.has(apiCall), `frontend must call window.electronAPI.${apiCall}`);
}

for (const [key, label] of [
  ['dashboard', 'Dashboard'],
  ['billing', 'New Sale'],
  ['products', 'Inventory'],
  ['purchases', 'Stock-In'],
  ['parties', 'Parties'],
  ['expenses', 'Expenses'],
  ['reports', 'Reports'],
  ['settings', 'Settings'],
]) {
  includes(sources.page, `key: '${key}'`, `navigation must expose ${key}`);
  includes(sources.page, `label: '${label}'`, `navigation must label ${key} as ${label}`);
}

const readinessContracts = [
  {
    area: 'Product & Inventory',
    source: sources.products,
    mustInclude: [
      'Register New Master Item',
      'Selling Price',
      'Cost Price',
      'min_stock_alert',
      'Add Field',
      'custom_fields',
      'Delete Product?',
      'requiredPin',
      'products.add',
      'products.update',
      'products.delete',
      'attributes.add',
    ],
  },
  {
    area: 'Billing & Sales',
    source: sources.billing,
    mustInclude: [
      'addToCart',
      'Cannot add more than available stock',
      'updateCartLineTotal',
      'Payment Mode',
      'Amount Paid',
      'Complete & Print',
      'sales.create',
      'pdf.generate',
      'pdf.saveAs',
      'wa.me',
      'Share on WhatsApp',
    ],
  },
  {
    area: 'Party Ledger & Payments',
    source: sources.parties,
    mustInclude: [
      'Transaction Ledger',
      'Collect Payment',
      'Record Payment',
      'payment_mode',
      'parties.recordPayment',
      'parties.getLedger',
      'requiredPin',
    ],
  },
  {
    area: 'Returns & Rollbacks',
    source: sources.reports,
    mustInclude: [
      'returns.createSaleReturn',
      'returns.createPurchaseReturn',
      'returns.deleteSaleReturn',
      'UNDO this return',
      'returned_total',
      'Process Sales Return',
      'Process Purchase Return',
    ],
  },
  {
    area: 'Dashboard & Analytics',
    source: sources.dashboard,
    mustInclude: [
      'Refresh Stats',
      'Inventory Value',
      'Restock Radar',
      'Recent Transactions',
      'stats.dashboard',
      'todayCash',
      'todayDigital',
      'todayCredit',
      'totalProfit',
      'returned_total',
    ],
  },
  {
    area: 'Reports & Downloads',
    source: sources.reports,
    mustInclude: [
      'Sales',
      'Purchases',
      'Returns',
      'Inventory',
      'Run Analysis',
      'Returned',
      'PDF',
      'reports.sales',
      'reports.purchases',
      'reports.stock',
      'stats.getMonthly',
    ],
  },
  {
    area: 'Settings & Security',
    source: sources.settings,
    mustInclude: [
      'storage.exportData',
      'storage.importData',
      'settings.getNeonConfig',
      'settings.setNeonConfig',
      'settings.syncToCloud',
      'Neon Cloud Sync',
      'delete_pin',
      'auth.setPassword',
    ],
  },
];

for (const contract of readinessContracts) {
  for (const needle of contract.mustInclude) {
    includes(contract.source, needle, `${contract.area} frontend contract missing ${needle}`);
  }
}

const backendIntegrityContracts = [
  [/process\.env\.INBILL_DB_PATH/, 'tests must be able to use isolated database path'],
  [/Insufficient stock for/, 'backend must block overselling'],
  [/min_stock_alert/, 'backend must persist and use low-stock thresholds'],
  [/Payment exceeds outstanding receivable/, 'customer payments must be capped'],
  [/Payment exceeds outstanding payable/, 'supplier payments must be capped'],
  [/lowStock:\s*lowStockItems/, 'dashboard must return low-stock rows for Restock Radar'],
  [/returned_total/, 'sales and reports must track returned totals'],
  [/deleteSaleReturn/, 'sales return undo must exist'],
  [/deletePurchaseReturn/, 'purchase return undo must exist'],
  [/returns:\s*db\.prepare\('SELECT \* FROM returns'\)/, 'backup export must include sales returns'],
  [/purchase_returns:\s*db\.prepare\('SELECT \* FROM purchase_returns'\)/, 'backup export must include purchase returns'],
  [/ensurePostgresSchema/, 'cloud sync must provision schema before upload'],
];

for (const [pattern, message] of backendIntegrityContracts) {
  matches(sources.db, pattern, message);
}

includes(sources.toastProvider, 'requiredPin', 'destructive confirmation must support PIN prompts');
includes(sources.invoiceTemplates, 'logo_path', 'invoice/PDF templates must support business logo');

console.log('Frontend/backend production contract checks passed');
