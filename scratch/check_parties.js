const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'store.db');
const db = new Database(dbPath);

console.log('--- Parties ---');
const parties = db.prepare('SELECT id, name, current_balance FROM parties').all();
console.table(parties);

console.log('--- Sales with Parties ---');
const sales = db.prepare('SELECT id, invoice_number, customer_name, party_id, total_amount, paid_amount, due_amount FROM sales WHERE party_id IS NOT NULL').all();
console.table(sales);

console.log('--- Party Transactions ---');
const txns = db.prepare('SELECT * FROM party_transactions').all();
console.table(txns);
