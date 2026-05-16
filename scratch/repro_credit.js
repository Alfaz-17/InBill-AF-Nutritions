const Database = require('better-sqlite3');
const db = new Database('repro.db');

// Setup minimal schema
db.exec(`
  CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY,
    name TEXT,
    type TEXT,
    current_balance REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS party_transactions (
    id INTEGER PRIMARY KEY,
    party_id INTEGER,
    type TEXT,
    total_amount REAL,
    paid_amount REAL,
    due_amount REAL,
    date TEXT
  );
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY,
    invoice_number TEXT,
    total_amount REAL,
    paid_amount REAL,
    due_amount REAL,
    payment_mode TEXT,
    returned_total REAL DEFAULT 0,
    date TEXT
  );
  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY,
    sale_id INTEGER,
    party_id INTEGER,
    total_amount REAL,
    date TEXT
  );
`);

const today = new Date().toISOString().split('T')[0];

// Case: Cash Sale + Return
// 1. Create Party
db.prepare("INSERT INTO parties (name, type) VALUES ('Test Party', 'Customer')").run();
const partyId = 1;

// 2. Create Cash Sale
db.prepare(`
  INSERT INTO sales (invoice_number, total_amount, paid_amount, due_amount, payment_mode, date)
  VALUES ('INV-001', 1000, 1000, 0, 'Cash', ?)
`).run(today);
const saleId = 1;

db.prepare(`
  INSERT INTO party_transactions (party_id, type, reference_id, total_amount, paid_amount, due_amount, date)
  VALUES (?, 'Sale', ?, 1000, 1000, 0, ?)
`).run(partyId, saleId, today);

// 3. Create Return for that Cash Sale
db.prepare(`
  INSERT INTO returns (sale_id, party_id, total_amount, date)
  VALUES (?, ?, 1000, ?)
`).run(saleId, partyId, today);
const returnId = 1;

db.prepare(`
  INSERT INTO party_transactions (party_id, type, reference_id, total_amount, date)
  VALUES (?, 'Sales Return', ?, 1000, ?)
`).run(partyId, returnId, today);

// 4. Calculate Today's Credit using the dashboard logic
const todayNetCredit = db.prepare(`
  SELECT 
    COALESCE(SUM(CASE WHEN pt.type = 'Sale' THEN pt.due_amount ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN pt.type = 'Payment' THEN pt.paid_amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN pt.type = 'Sales Return' THEN pt.total_amount ELSE 0 END), 0)
  AS net_change
  FROM party_transactions pt
  WHERE date(pt.date) = ?
`).get(today).net_change;

console.log("Today's Net Credit (should be 0 for a cash return, but current logic says):", todayNetCredit);

db.close();
require('fs').unlinkSync('repro.db');
