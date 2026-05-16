const Database = require('better-sqlite3');
const postgres = require('postgres');
const path = require('path');
let app;
try {
  const electron = require('electron');
  app = electron.app;
} catch (e) {
  // Headless/Test mode
  app = { isPackaged: false, getPath: () => '.' };
}

const isDev = app ? !app.isPackaged : true;
const dbPath = isDev 
  ? path.join(__dirname, '../store.db') 
  : path.join(app.getPath('userData'), 'store.db');

let db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('cache_size = -64000'); // 64MB cache for speed
db.pragma('temp_store = MEMORY');

// Cloud Configuration
let sql = null;
let currentUrl = null;
const getSql = (forceUrl = null) => {
  let url = forceUrl;
  
  if (!url) {
    // Try to get from DB if not provided and not in process.env
    try {
      const config = db.prepare('SELECT neon_db_url, use_cloud FROM business_profile WHERE id = 1').get();
      if (config && (config.use_cloud || forceUrl)) {
        url = config.neon_db_url;
      }
    } catch (e) {
      url = process.env.DATABASE_URL;
    }
  }

  if (url) {
    // If URL has changed, reset the connection
    if (url !== currentUrl) {
      if (sql) {
        try { sql.end(); } catch(e) {}
      }
      sql = null;
      currentUrl = url;
    }

    if (!sql) {
      try {
        // Neon requires SSL
        sql = postgres(url, { 
          ssl: { rejectUnauthorized: false },
          connect_timeout: 10,
          max: 10
        });
      } catch (err) {
        console.error("❌ Failed to initialize Neon Connection:", err.message);
        sql = null;
        currentUrl = null;
      }
    }
    return sql;
  }
  return null;
};

/* ───────── Schema ───────── */
const initDB = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name  TEXT    NOT NULL,
      brand         TEXT    DEFAULT '',
      category      TEXT    DEFAULT '',
      unit          TEXT    DEFAULT 'pcs',
      mrp           REAL    DEFAULT 0,
      selling_price REAL    DEFAULT 0,
      cost_price    REAL    DEFAULT 0,
      barcode       TEXT    DEFAULT '',
      gst_rate      REAL    DEFAULT 0,
      cgst          REAL    DEFAULT 0,
      sgst          REAL    DEFAULT 0,
      quantity      INTEGER DEFAULT 0,
      batch_number  TEXT    DEFAULT '',
      expiry_date   TEXT    DEFAULT '',
      product_size  TEXT    DEFAULT '',
      is_deleted    INTEGER DEFAULT 0,
      custom_fields TEXT    DEFAULT '{}',
      min_stock_alert INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  // Table creation handles most columns. Migrations for existing databases are below.

  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    DEFAULT (datetime('now','localtime')),
      category    TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      amount      REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT    NOT NULL UNIQUE,
      date           TEXT    DEFAULT (datetime('now','localtime')),
      customer_name  TEXT    DEFAULT '',
      customer_phone TEXT    DEFAULT '',
      customer_address TEXT  DEFAULT '',
      subtotal       REAL    DEFAULT 0,
      total_gst      REAL    DEFAULT 0,
      misc_charges   REAL    DEFAULT 0,
      total_amount   REAL    DEFAULT 0,
      payment_mode   TEXT    DEFAULT 'Cash',
      paid_amount    REAL    DEFAULT 0,
      due_amount     REAL    DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id     INTEGER NOT NULL,
      product_id  INTEGER NOT NULL,
      product_name TEXT   NOT NULL,
      quantity    INTEGER NOT NULL,
      price       REAL    NOT NULL,
      cost_price  REAL    DEFAULT 0,
      gst_rate    REAL    DEFAULT 0,
      gst_amount  REAL    DEFAULT 0,
      total_price REAL    DEFAULT 0,
      FOREIGN KEY (sale_id)    REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT    DEFAULT (datetime('now','localtime')),
      supplier_name TEXT    DEFAULT '',
      party_id      INTEGER,
      total_amount  REAL    DEFAULT 0,
      paid_amount   REAL    DEFAULT 0,
      due_amount    REAL    DEFAULT 0,
      other_charges REAL    DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id   INTEGER NOT NULL,
      product_id    INTEGER,
      product_name  TEXT    NOT NULL,
      quantity      INTEGER DEFAULT 0,
      price         REAL    DEFAULT 0,
      batch_number  TEXT    DEFAULT '',
      expiry_date   TEXT    DEFAULT '',
      FOREIGN KEY (purchase_id) REFERENCES purchases(id)
    );

    CREATE TABLE IF NOT EXISTS parties (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      phone        TEXT    DEFAULT '',
      address      TEXT    DEFAULT '',
      gstin        TEXT    DEFAULT '',
      type         TEXT    DEFAULT 'Customer',
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      created_at   TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS party_transactions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id      INTEGER NOT NULL,
      type          TEXT    NOT NULL, -- 'Sale', 'Purchase', 'Payment'
      reference_id  INTEGER,         -- ID of the sale, purchase
      total_amount  REAL    DEFAULT 0,
      paid_amount   REAL    DEFAULT 0,
      due_amount    REAL    DEFAULT 0,
      payment_mode  TEXT    DEFAULT 'Cash',
      note          TEXT,
      date          TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (party_id) REFERENCES parties(id)
    );
  `);

  // Self-Healing for Return Tables (Legacy Cleanup)
  try {
    const returnInfo = db.prepare("PRAGMA table_info(returns)").all();
    const returnCols = returnInfo.map(c => c.name);
    // If table exists but has legacy 'invoice_number' (which we no longer use for returns), recreate it
    if (returnCols.length > 0 && returnCols.includes('invoice_number')) {
      db.exec("DROP TABLE IF EXISTS return_items");
      db.exec("DROP TABLE IF EXISTS returns");
    }
  } catch(e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS returns (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT    DEFAULT (datetime('now','localtime')),
      sale_id       INTEGER,
      party_id      INTEGER,
      total_amount  REAL    DEFAULT 0,
      reason        TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (party_id) REFERENCES parties(id)
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id   INTEGER NOT NULL,
      product_id  INTEGER NOT NULL,
      product_name TEXT   NOT NULL,
      quantity    INTEGER NOT NULL,
      price       REAL    NOT NULL,
      total_price REAL    DEFAULT 0,
      FOREIGN KEY (return_id)  REFERENCES returns(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_returns (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT    DEFAULT (datetime('now','localtime')),
      purchase_id   INTEGER,
      party_id      INTEGER,
      total_amount  REAL    DEFAULT 0,
      reason        TEXT,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id),
      FOREIGN KEY (party_id) REFERENCES parties(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_return_id INTEGER NOT NULL,
      product_id         INTEGER,
      product_name       TEXT    NOT NULL,
      quantity           INTEGER NOT NULL,
      price              REAL    NOT NULL,
      total_price        REAL    DEFAULT 0,
      FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS business_profile (
      id              INTEGER PRIMARY KEY DEFAULT 1,
      business_name   TEXT    DEFAULT 'My Business',
      business_short  TEXT    DEFAULT 'MB',
      tagline         TEXT    DEFAULT 'Billing & Inventory',
      address_line1   TEXT    DEFAULT '',
      address_line2   TEXT    DEFAULT '',
      city            TEXT    DEFAULT '',
      state           TEXT    DEFAULT '',
      pincode         TEXT    DEFAULT '',
      phone           TEXT    DEFAULT '',
      email           TEXT    DEFAULT '',
      gstin           TEXT    DEFAULT '',
      logo_path       TEXT    DEFAULT '',
      invoice_prefix  TEXT    DEFAULT 'INV',
      invoice_footer  TEXT    DEFAULT 'Thank you for your business!',
      currency_symbol TEXT    DEFAULT '₹',
      business_type   TEXT    DEFAULT 'General',
      invoice_settings TEXT    DEFAULT '{}',
      master_data      TEXT    DEFAULT '{}',
      created_at      TEXT    DEFAULT (datetime('now','localtime')),
      mobile_secret     TEXT    DEFAULT '',
      gemini_api_key    TEXT    DEFAULT '',
      neon_db_url       TEXT    DEFAULT '',
      use_cloud         INTEGER DEFAULT 0
    );
  `);

  try { db.exec("ALTER TABLE business_profile ADD COLUMN logo_path TEXT DEFAULT ''"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN invoice_settings TEXT DEFAULT '{}'"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN master_data TEXT DEFAULT '{}'"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN bank_details TEXT DEFAULT ''"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN whatsapp_settings TEXT DEFAULT '{}'"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN mobile_secret TEXT DEFAULT ''"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN gemini_api_key TEXT DEFAULT ''"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN neon_db_url TEXT DEFAULT ''"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN use_cloud INTEGER DEFAULT 0"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN software_password TEXT DEFAULT ''"); } catch(e){}
  // Performance Indexes for long-term data growth (Decade-Proofing)
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_sales_party ON sales(party_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_party_tx_party ON party_transactions(party_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(is_deleted)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name)"); } catch(e){}

  // console.log('⚡ Database Decade-Proofing Active');

  db.exec(`
    CREATE TABLE IF NOT EXISTS product_attribute_defs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      type        TEXT    NOT NULL, -- text, number, date, select
      required    INTEGER DEFAULT 0,
      options     TEXT, -- JSON array for select type
      business_id INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS custom_categories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      sort_order    INTEGER DEFAULT 0,
      is_active     INTEGER DEFAULT 1,
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS expense_categories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      is_default    INTEGER DEFAULT 0
    );
  `);

  // Ensure business profile exists
  db.prepare('INSERT OR IGNORE INTO business_profile (id) VALUES (1)').run();

  // Simple migration: Check for missing columns in products table
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  const columns = tableInfo.map(c => c.name);

  if (!columns.includes('mrp')) {
    db.exec("ALTER TABLE products ADD COLUMN mrp REAL DEFAULT 0");
  }
  if (!columns.includes('cost_price')) {
    db.exec("ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0");
  }
  if (!columns.includes('barcode')) {
    db.exec("ALTER TABLE products ADD COLUMN barcode TEXT DEFAULT ''");
  }
  if (!columns.includes('product_size')) {
    db.exec("ALTER TABLE products ADD COLUMN product_size TEXT DEFAULT ''");
  }

  if (!columns.includes('is_deleted')) {
    db.exec("ALTER TABLE products ADD COLUMN is_deleted INTEGER DEFAULT 0");
  } else {
    // Ensure any legacy NULL values are fixed
    db.exec("UPDATE products SET is_deleted = 0 WHERE is_deleted IS NULL");
  }

  if (!columns.includes('custom_fields')) {
    db.exec("ALTER TABLE products ADD COLUMN custom_fields TEXT DEFAULT '{}'");
  }

  if (!columns.includes('min_stock_alert')) {
    db.exec("ALTER TABLE products ADD COLUMN min_stock_alert INTEGER DEFAULT 0");
  }

  // Sales & Sale Items migration
  const saleInfo = db.prepare("PRAGMA table_info(sales)").all();
  const saleColumns = saleInfo.map(c => c.name);
  if (!saleColumns.includes('total_discount')) {
    db.exec("ALTER TABLE sales ADD COLUMN total_discount REAL DEFAULT 0");
  }
  if (!saleColumns.includes('customer_phone')) {
    db.exec("ALTER TABLE sales ADD COLUMN customer_phone TEXT DEFAULT ''");
  }
  if (!saleColumns.includes('due_amount')) {
    db.exec("ALTER TABLE sales ADD COLUMN due_amount REAL DEFAULT 0");
  }

  const saleItemInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  const itemColumns = saleItemInfo.map(c => c.name);
  if (!itemColumns.includes('mrp')) {
    db.exec("ALTER TABLE sale_items ADD COLUMN mrp REAL DEFAULT 0");
  }
  if (!itemColumns.includes('discount')) {
    db.exec("ALTER TABLE sale_items ADD COLUMN discount REAL DEFAULT 0");
  }
  if (!itemColumns.includes('cost_price')) {
    db.exec("ALTER TABLE sale_items ADD COLUMN cost_price REAL DEFAULT 0");
  }

  // Purchases migration
  const purchaseInfo = db.prepare("PRAGMA table_info(purchases)").all();
  const purchaseColumns = purchaseInfo.map(c => c.name);
  if (!purchaseColumns.includes('paid_amount')) {
    db.exec("ALTER TABLE purchases ADD COLUMN paid_amount REAL DEFAULT 0");
    db.exec("ALTER TABLE purchases ADD COLUMN due_amount REAL DEFAULT 0");
  }
  if (!purchaseColumns.includes('party_id')) {
    db.exec("ALTER TABLE purchases ADD COLUMN party_id INTEGER DEFAULT NULL");
  }

  // New: ID-Safety for items
  try {
    const piInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
    const piCols = piInfo.map(c => c.name);
    if (!piCols.includes('product_id')) db.exec("ALTER TABLE purchase_items ADD COLUMN product_id INTEGER");

    const priInfo = db.prepare("PRAGMA table_info(purchase_return_items)").all();
    const priCols = priInfo.map(c => c.name);
    if (!priCols.includes('product_id')) db.exec("ALTER TABLE purchase_return_items ADD COLUMN product_id INTEGER");
  } catch(e) {}

  // Sales migration for party_id
  if (!saleColumns.includes('party_id')) {
    db.exec("ALTER TABLE sales ADD COLUMN party_id INTEGER DEFAULT NULL");
  }

  const partyTxInfo = db.prepare("PRAGMA table_info(party_transactions)").all();
  const partyTxColumns = partyTxInfo.map(c => c.name);
  if (!partyTxColumns.includes('payment_mode')) {
    db.exec("ALTER TABLE party_transactions ADD COLUMN payment_mode TEXT DEFAULT 'Cash'");
  }

  // Returns migration
  try {
    const returnInfo = db.prepare("PRAGMA table_info(returns)").all();
    const returnCols = returnInfo.map(c => c.name);
    if (returnCols.length > 0) {
      if (!returnCols.includes('party_id')) db.exec("ALTER TABLE returns ADD COLUMN party_id INTEGER");
      if (!returnCols.includes('total_amount')) db.exec("ALTER TABLE returns ADD COLUMN total_amount REAL DEFAULT 0");
      if (!returnCols.includes('reason')) db.exec("ALTER TABLE returns ADD COLUMN reason TEXT");
    }
  } catch(e) {}

  try {
    const pReturnInfo = db.prepare("PRAGMA table_info(purchase_returns)").all();
    const pReturnCols = pReturnInfo.map(c => c.name);
    if (pReturnCols.length > 0) {
      if (!pReturnCols.includes('party_id')) db.exec("ALTER TABLE purchase_returns ADD COLUMN party_id INTEGER");
      if (!pReturnCols.includes('total_amount')) db.exec("ALTER TABLE purchase_returns ADD COLUMN total_amount REAL DEFAULT 0");
      if (!pReturnCols.includes('reason')) db.exec("ALTER TABLE purchase_returns ADD COLUMN reason TEXT");
    }
  } catch(e) {}

  // NOTE: Automatic seeding removed. The Setup Wizard handles first-time configuration.
  // resetDB() remains available from Settings for fresh start.
};

const resetDB = () => {
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      const tables = [
        'sale_items', 'purchase_items', 'party_transactions',
        'sales', 'purchases', 'products', 'parties',
        'custom_categories', 'expense_categories', 'product_attribute_defs',
        'expenses', 'returns', 'return_items', 'purchase_returns', 'purchase_return_items'
      ];
      tables.forEach(t => {
        try { db.prepare(`DELETE FROM ${t}`).run(); } catch(e) {}
      });
      
      // Reset auto-increment counters
      db.prepare("DELETE FROM sqlite_sequence").run();

      // Reset business profile
      db.prepare('UPDATE business_profile SET business_type=NULL, business_name=NULL WHERE id=1').run();
    });
    txn();
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
};

/* ───────── Helpers ───────── */
const generateInvoiceNumber = () => {
  const profile = db.prepare('SELECT invoice_prefix FROM business_profile WHERE id = 1').get();
  const prefix = profile?.invoice_prefix || 'INV';
  
  const row = db.prepare(`SELECT invoice_number FROM sales ORDER BY id DESC LIMIT 1`).get();
  if (!row) return `${prefix}-001`;
  
  // Extract number even if prefix has changed
  const lastNum = row.invoice_number.match(/\d+$/);
  const nextNum = lastNum ? parseInt(lastNum[0], 10) + 1 : 1;
  
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
};

/* ───────── Party Ops ───────── */
const partyOps = {
  getAll: (type) => {
    if (type) return db.prepare('SELECT * FROM parties WHERE type = ? ORDER BY name ASC').all(type);
    return db.prepare('SELECT * FROM parties ORDER BY name ASC').all();
  },
  getById: (id) => db.prepare('SELECT * FROM parties WHERE id = ?').get(id),
  add: (p) => {
    const res = db.prepare(`
      INSERT INTO parties (name, phone, address, gstin, type, opening_balance, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(p.name, p.phone || '', p.address || '', p.gstin || '', p.type || 'Customer', p.opening_balance || 0, p.opening_balance || 0);
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return res;
  },
  update: (id, p) => {
    const res = db.prepare(`
      UPDATE parties SET name=?, phone=?, address=?, gstin=?, type=?, opening_balance=?
      WHERE id=?
    `).run(p.name, p.phone || '', p.address || '', p.gstin || '', p.type || 'Customer', p.opening_balance || 0, id);
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return res;
  },
  delete: (id) => {
    const party = db.prepare('SELECT current_balance FROM parties WHERE id = ?').get(id);
    if (party && Math.abs(party.current_balance) > 0.1) {
      throw new Error("Cannot delete a party with an outstanding balance. Clear dues first.");
    }
    const result = db.prepare('DELETE FROM parties WHERE id = ?').run(id);
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return result;
  },
  updateBalance: (id, amount) => db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?').run(amount, id),
  
  getLedger: (partyId) => db.prepare(`
    SELECT * FROM party_transactions 
    WHERE party_id = ? 
    ORDER BY date DESC
  `).all(partyId),

  recordPayment: (data) => {
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    const txn = db.transaction(() => {
      // Record payment in transaction ledger
      db.prepare(`
        INSERT INTO party_transactions (party_id, type, total_amount, paid_amount, payment_mode, note, date)
        VALUES (?, 'Payment', ?, ?, ?, ?, ?)
      `).run(data.party_id, data.amount, data.amount, data.payment_mode || 'Cash', data.note || '', data.date || today);

      // Update party current balance
      // If payment from customer: current_balance decreases (they owe less)
      // If payment to supplier: current_balance increases (we owe less, balance moves from negative toward zero)
      const party = db.prepare('SELECT type FROM parties WHERE id = ?').get(data.party_id);
      const direction = party.type === 'Customer' ? -1 : 1;
      
      db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?')
        .run(data.amount * direction, data.party_id);

      return { success: true };
    });
    const result = txn();
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return result;
  }
};

/* ───────── Product Ops ───────── */
const productOps = {
  getAll: () => db.prepare('SELECT * FROM products WHERE COALESCE(is_deleted, 0) = 0 ORDER BY product_name ASC').all(),
  
  getById: (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id),

  search: (term) => db.prepare(
    `SELECT * FROM products WHERE COALESCE(is_deleted, 0) = 0 AND (product_name LIKE ? OR brand LIKE ? OR category LIKE ? OR product_size LIKE ?) ORDER BY product_name ASC`
  ).all(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`),

  add: (p) => {
    const trimmedName = (p.product_name || '').trim();
    const gst = p.gst_rate || 0;
    const cgst = p.cgst ?? (gst / 2);
    const sgst = p.sgst ?? (gst / 2);

    const existing = db.prepare(`
      SELECT id FROM products 
      WHERE LOWER(REPLACE(product_name, ' ', '')) = LOWER(REPLACE(?, ' ', '')) 
      ORDER BY is_deleted DESC
      LIMIT 1
    `).get(trimmedName);

    // NIGHTMARE PREVENTION: Duplicate Barcode Check
    if (p.barcode && p.barcode.trim() !== '') {
      const barcodeExists = db.prepare('SELECT id, product_name FROM products WHERE barcode = ? AND is_deleted = 0 AND id != ?').get(p.barcode, existing?.id || 0);
      if (barcodeExists) {
        throw new Error(`Barcode '${p.barcode}' is already assigned to '${barcodeExists.product_name}'.`);
      }
    }

    // Safety: No negative prices or stock
    if ((p.selling_price || 0) < 0 || (p.quantity || 0) < 0) {
      throw new Error("Price and Quantity must be positive numbers.");
    }

    if (existing) {
      console.log(`[DB] Manually re-activating product: ${trimmedName}`);
      return db.prepare(`
        UPDATE products SET 
          brand=?, category=?, product_size=?, unit=?, mrp=?, selling_price=?, cost_price=?, 
          barcode=?, gst_rate=?, cgst=?, sgst=?, quantity=?, batch_number=?, expiry_date=?,
          is_deleted=0, custom_fields=?
        WHERE id=?
      `).run(p.brand || '', p.category || '', p.product_size || '', p.unit || 'pcs',
             p.mrp || 0, p.selling_price || 0, p.cost_price || 0, p.barcode || '',
             gst, cgst, sgst, p.quantity || 0, p.batch_number || '', p.expiry_date || '', 
             p.custom_fields || '{}',
             existing.id);
      const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
      if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
      return res;
    }

    const res = db.prepare(`
      INSERT INTO products (product_name, brand, category, product_size, unit, mrp, selling_price, cost_price, barcode, gst_rate, cgst, sgst, quantity, batch_number, expiry_date, is_deleted, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(trimmedName, p.brand || '', p.category || '', p.product_size || '', p.unit || 'pcs',
           p.mrp || 0, p.selling_price || 0, p.cost_price || 0, p.barcode || '',
           gst, cgst, sgst, p.quantity || 0, p.batch_number || '', p.expiry_date || '', 
           p.custom_fields || '{}');
           
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return res;
  },

  update: (id, p) => {
    const gst = p.gst_rate || 0;
    const cgst = p.cgst ?? (gst / 2);
    const sgst = p.sgst ?? (gst / 2);
    const res = db.prepare(`
      UPDATE products SET 
        product_name=?, brand=?, category=?, product_size=?, unit=?, mrp=?, selling_price=?, cost_price=?, 
        barcode=?, gst_rate=?, cgst=?, sgst=?, quantity=?, batch_number=?, expiry_date=?, custom_fields=?
      WHERE id=?
    `).run(p.product_name, p.brand || '', p.category || '', p.product_size || '', p.unit || 'pcs',
           p.mrp || 0, p.selling_price || 0, p.cost_price || 0, p.barcode || '',
           gst, cgst, sgst, p.quantity || 0, p.batch_number || '', p.expiry_date || '', 
           p.custom_fields || '{}', id);

    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return res;
  },

  getLastPurchasePrice: (productName) => {
    const row = db.prepare(`
      SELECT price FROM purchase_items 
      WHERE product_name = ? 
      ORDER BY id DESC LIMIT 1
    `).get(productName);
    return row ? row.price : 0;
  },

  delete: (id) => {
    const result = db.prepare('UPDATE products SET is_deleted = 1 WHERE id = ?').run(id);
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return result;
  },

  getLowStock: (threshold = 10) => db.prepare(
    'SELECT * FROM products WHERE is_deleted = 0 AND quantity <= ? AND quantity >= 0 ORDER BY quantity ASC'
  ).all(threshold),

  getExpiring: (days = 30) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const dateStr = futureDate.toISOString().split('T')[0];
    return db.prepare(
      `SELECT * FROM products WHERE is_deleted = 0 AND expiry_date != '' AND expiry_date <= ? ORDER BY expiry_date ASC`
    ).all(dateStr);
  },
};

/* ───────── Sale Ops ───────── */
const saleOps = {
  create: async (saleData) => {
    const txn = db.transaction(() => {
      // ... (existing logic remains same)
      const invoiceNumber = generateInvoiceNumber();
      let subtotal = 0;
      let totalGst = 0;

      const taxMode = saleData.tax_mode || 'exclusive';

      // Validate items before starting
      if (!saleData.items || saleData.items.length === 0) throw new Error("Sale must have at least one item.");

      for (const item of saleData.items) {
        if (item.quantity <= 0) throw new Error(`Invalid quantity for ${item.product_name}.`);
        if (item.price < 0) throw new Error(`Invalid price for ${item.product_name}.`);

        const itemQty = Number(item.quantity) || 0;
        const itemPrice = parseFloat(item.price) || 0;
        const itemLineTotal = itemPrice * itemQty;
        
        let gstAmount = 0;
        let basePrice = itemPrice;

        if (taxMode === 'inclusive') {
          basePrice = itemPrice / (1 + (item.gst_rate / 100));
          gstAmount = itemLineTotal - (basePrice * itemQty);
        } else {
          gstAmount = (itemLineTotal * item.gst_rate) / 100;
        }

        const itemTotal = taxMode === 'inclusive' ? itemLineTotal : itemLineTotal + gstAmount;
        
        item.gst_amount = gstAmount;
        item.total_price = itemTotal;
        item.base_price = basePrice;
        
        item.discount = (item.mrp || item.price) > item.price ? (item.mrp - item.price) * item.quantity : 0;
        subtotal += basePrice * itemQty;
        totalGst += gstAmount;
      }

      const totalDiscount = saleData.items.reduce((sum, i) => sum + (i.discount || 0), 0);
      const miscCharges = parseFloat(saleData.misc_charges) || 0;
      const rawTotalAmount = subtotal + totalGst + miscCharges;
      const totalAmount = Math.round(rawTotalAmount);
      const paid_amount = saleData.paid_amount !== undefined ? Number(saleData.paid_amount) : totalAmount;
      const dueAmount = Math.max(0, totalAmount - paid_amount);

      const saleInfo = db.prepare(`
        INSERT INTO sales (invoice_number, party_id, customer_name, customer_phone, subtotal, total_gst, misc_charges, total_amount, total_discount, payment_mode, paid_amount, due_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(invoiceNumber, saleData.party_id || null, saleData.customer_name || '', saleData.customer_phone || '', Number(subtotal.toFixed(2)), Number(totalGst.toFixed(2)), saleData.misc_charges || 0, totalAmount, totalDiscount, saleData.payment_mode || 'Cash', paid_amount, dueAmount);

      const saleId = saleInfo.lastInsertRowid;

      if (saleData.party_id) {
        db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?').run(dueAmount, saleData.party_id);
        db.prepare(`
          INSERT INTO party_transactions (party_id, type, reference_id, total_amount, paid_amount, due_amount, date)
          VALUES (?, 'Sale', ?, ?, ?, ?, datetime('now','localtime'))
        `).run(saleData.party_id, saleId, totalAmount, saleData.paid_amount || 0, dueAmount);
      }

      const insertItem = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, mrp, price, cost_price, discount, gst_rate, gst_amount, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const getCost = db.prepare('SELECT cost_price FROM products WHERE id = ?');
      const reduceStock = db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?');

      for (const item of saleData.items) {
        let pName = item.product_name;
        if (!pName && item.product_id) {
          const p = db.prepare('SELECT product_name FROM products WHERE id = ?').get(item.product_id);
          pName = p?.product_name || 'Unknown Product';
        }

        const product = getCost.get(item.product_id);
        const costPrice = product ? product.cost_price : 0;
        insertItem.run(saleId, item.product_id, pName, item.quantity, item.mrp || item.price, item.base_price, costPrice, item.discount || 0, item.gst_rate, item.gst_amount, item.total_price);
        reduceStock.run(item.quantity, item.product_id);
      }

      const createdSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      createdSale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
      return createdSale;
    });

    const result = txn();
    
    // Auto-Sync to Cloud in background if enabled in settings
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) {
      syncToCloud().catch(err => console.error("Auto-Sync Failed:", err));
    }

    return result;
  },

  delete: (id) => {
    const txn = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
      if (!sale) return;

      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
      
      // 1. Restore Stock (Only restore what wasn't already returned)
      const restoreStock = db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?');
      for (const item of items) {
        const returnedQty = db.prepare(`
          SELECT COALESCE(SUM(ri.quantity), 0) as qty 
          FROM return_items ri
          JOIN returns r ON ri.return_id = r.id
          WHERE r.sale_id = ? AND ri.product_id = ?
        `).get(id, item.product_id).qty;
        
        const netRestorable = item.quantity - returnedQty;
        if (netRestorable > 0) {
          restoreStock.run(netRestorable, item.product_id);
        }
      }

      // 2. Adjust Party Balance
      if (sale.party_id) {
        // Reverse the entire sale impact. If they paid part of it, that payment now becomes a credit on their account.
        db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ?')
          .run(sale.total_amount, sale.party_id);
        
        db.prepare("DELETE FROM party_transactions WHERE type = 'Sale' AND reference_id = ?")
          .run(id);
      }

      // 3. Delete sale records (including returns to prevent orphans)
      const returns = db.prepare('SELECT id FROM returns WHERE sale_id = ?').all(id);
      for (const ret of returns) {
        db.prepare('DELETE FROM return_items WHERE return_id = ?').run(ret.id);
      }
      db.prepare('DELETE FROM returns WHERE sale_id = ?').run(id);
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);
      db.prepare('DELETE FROM sales WHERE id = ?').run(id);
    });
    return txn();
  },

  getAll: () => db.prepare(`
    SELECT s.*, p.name as customer_name, p.phone as customer_phone
    FROM sales s
    LEFT JOIN parties p ON s.party_id = p.id
    ORDER BY s.date DESC
  `).all(),

  getById: (id) => {
    const sale = db.prepare(`
      SELECT s.*, p.name as customer_name, p.phone as customer_phone, p.address as customer_address, p.gstin as customer_gstin
      FROM sales s
      LEFT JOIN parties p ON s.party_id = p.id
      WHERE s.id = ?
    `).get(id);
    if (!sale) return null;
    sale.items = db.prepare(`
      SELECT 
        si.*,
        (SELECT COALESCE(SUM(ri.quantity), 0) FROM return_items ri JOIN returns r ON ri.return_id = r.id WHERE r.sale_id = ? AND ri.product_id = si.product_id) as returned_quantity,
        p.brand,
        p.category,
        p.unit,
        p.barcode,
        p.product_size,
        p.batch_number,
        p.expiry_date,
        p.custom_fields
      FROM sale_items si
      LEFT JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ?
    `).all(id, id);
    return sale;
  },

  getByInvoice: (invoiceNumber) => {
    const sale = db.prepare(`
      SELECT s.*, p.name as customer_name, p.phone as customer_phone, p.address as customer_address, p.gstin as customer_gstin
      FROM sales s
      LEFT JOIN parties p ON s.party_id = p.id
      WHERE s.invoice_number = ?
    `).get(invoiceNumber);
    if (!sale) return null;
    sale.items = db.prepare(`
      SELECT 
        si.*,
        (SELECT COALESCE(SUM(ri.quantity), 0) FROM return_items ri JOIN returns r ON ri.return_id = r.id WHERE r.sale_id = ? AND ri.product_id = si.product_id) as returned_quantity,
        p.brand,
        p.category,
        p.unit,
        p.barcode,
        p.product_size,
        p.batch_number,
        p.expiry_date,
        p.custom_fields
      FROM sale_items si
      LEFT JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ?
    `).all(sale.id, sale.id);
    return sale;
  },

  getByDateRange: (from, to) => db.prepare(`
    SELECT s.*, p.name as customer_name
    FROM sales s
    LEFT JOIN parties p ON s.party_id = p.id
    WHERE date(s.date) BETWEEN ? AND ? 
    ORDER BY s.date DESC
  `).all(from, to),

  getTodaySales: () => {
    const today = new Date().toISOString().split('T')[0];
    const row = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM sales WHERE date(date) = ?`
    ).get(today);
    return row;
  },
};

/* ───────── Purchase Ops ───────── */
const purchaseOps = {
  create: async (purchaseData) => {
    const txn = db.transaction(() => {
      let totalAmount = 0;
      for (const item of purchaseData.items) {
        totalAmount += (item.price || 0) * (item.quantity || 0);
      }
      const otherCharges = parseFloat(purchaseData.other_charges) || 0;
      totalAmount += otherCharges;
      
      let updatedCount = 0;
      let createdCount = 0;

      const paidAmount = parseFloat(purchaseData.paid_amount) || 0;
      const dueAmount = totalAmount - paidAmount;

      const info = db.prepare(`
        INSERT INTO purchases (party_id, supplier_name, total_amount, paid_amount, due_amount, other_charges) VALUES (?, ?, ?, ?, ?, ?)
      `).run(purchaseData.party_id || null, purchaseData.supplier_name || '', totalAmount, paidAmount, dueAmount, otherCharges);

      const purchaseId = info.lastInsertRowid;

      // Update party balance & record transaction if it's a party-linked purchase
      if (purchaseData.party_id) {
        // Decrease balance because we now owe more money (Negative balance = Payable)
        db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ?')
          .run(totalAmount - (purchaseData.paid_amount || 0), purchaseData.party_id);

        db.prepare(`
          INSERT INTO party_transactions (party_id, type, reference_id, total_amount, paid_amount, due_amount, date)
          VALUES (?, 'Purchase', ?, ?, ?, ?, datetime('now','localtime'))
        `).run(purchaseData.party_id, purchaseId, totalAmount, purchaseData.paid_amount || 0, totalAmount - (purchaseData.paid_amount || 0));
      }

      const insertItem = db.prepare(`
        INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, price, batch_number, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of purchaseData.items) {
        const trimmedName = (item.product_name || '').trim();
        const purchasePrice = parseFloat(item.price) || 0;

        // Robust matching: Ignore spaces and case. Prioritize deleted rows for resurrection.
        let existing = db.prepare(`
          SELECT id FROM products 
          WHERE LOWER(REPLACE(product_name, ' ', '')) = LOWER(REPLACE(?, ' ', '')) 
          ORDER BY is_deleted DESC
          LIMIT 1
        `).get(trimmedName);

        if (!existing) {
          existing = db.prepare(`
            SELECT id FROM products 
            WHERE LOWER(product_name) LIKE ? OR ? LIKE '%' || LOWER(product_name) || '%' 
            ORDER BY is_deleted DESC
            LIMIT 1
          `).get(`%${trimmedName.toLowerCase()}%`, trimmedName.toLowerCase());
        }

        let targetId;
        if (existing) {
          const existingProduct = db.prepare('SELECT quantity, cost_price, custom_fields FROM products WHERE id = ?').get(existing.id);
          const currentCost = existingProduct.cost_price || 0;
          if (purchasePrice > currentCost) {
             console.log(`[DB] Price increase detected. Creating separate new item record.`);
             existing = null;
          }
        }

        const gstRate = parseFloat(item.gst_rate) || 0;
        if (existing) {
          targetId = existing.id;
          const existingProduct = db.prepare('SELECT custom_fields FROM products WHERE id = ?').get(targetId);
          let mergedFields = {};
          try { mergedFields = JSON.parse(existingProduct?.custom_fields || '{}'); } catch (e) {}
          Object.assign(mergedFields, item.custom_fields || {});

          db.prepare(`
            UPDATE products 
            SET quantity = quantity + ?, batch_number = ?, expiry_date = ?,
                cost_price = ?, mrp = ?, selling_price = ?, product_size = ?,
                gst_rate = ?, cgst = ?, sgst = ?, custom_fields = ?, is_deleted = 0
            WHERE id = ?
          `).run(item.quantity || 0, item.batch_number || '', item.expiry_date || '', 
                 purchasePrice, item.mrp || purchasePrice, item.selling_price || purchasePrice, 
                 item.product_size || '', gstRate, gstRate / 2, gstRate / 2,
                 JSON.stringify(mergedFields), targetId);
          updatedCount++;
        } else {
          const info = db.prepare(`
            INSERT INTO products (product_name, brand, category, product_size, unit, cost_price, mrp, selling_price, gst_rate, cgst, sgst, quantity, batch_number, expiry_date, custom_fields)
            VALUES (?, '', ?, ?, 'pcs', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(trimmedName, item.category || '', item.product_size || '', purchasePrice, item.mrp || purchasePrice, item.selling_price || purchasePrice * 1.2, 
                 gstRate, gstRate / 2, gstRate / 2,
                 item.quantity || 0, item.batch_number || '', item.expiry_date || '', JSON.stringify(item.custom_fields || {}));
          targetId = info.lastInsertRowid;
          createdCount++;
        }

        // Now save the purchase item linked by ID
        insertItem.run(purchaseId, targetId, trimmedName, item.quantity || 0,
                       item.price || 0, item.batch_number || '', item.expiry_date || '');
      }
      console.log(`[DB] Purchase ${purchaseId} recorded. Updated: ${updatedCount}, Created: ${createdCount}`);

      return { purchaseId, totalAmount, updatedCount, createdCount };
    });
    const result = txn();
    
    // Auto-Sync to Cloud in background if enabled in settings
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) {
      syncToCloud().catch(err => console.error("Auto-Sync Failed:", err));
    }

    return result;
  },

  getAll: () => db.prepare(`
    SELECT p.*, pt.name as supplier_name 
    FROM purchases p 
    LEFT JOIN parties pt ON p.party_id = pt.id 
    ORDER BY p.date DESC
  `).all(),

  getById: (id) => {
    const purchase = db.prepare(`
      SELECT p.*, pt.name as supplier_name, pt.phone as supplier_phone, pt.address as supplier_address
      FROM purchases p
      LEFT JOIN parties pt ON p.party_id = pt.id
      WHERE p.id = ?
    `).get(id);
    if (!purchase) return null;
    purchase.items = db.prepare(`
      SELECT 
        pi.*,
        (SELECT COALESCE(SUM(pri.quantity), 0) FROM purchase_return_items pri JOIN purchase_returns pr ON pri.purchase_return_id = pr.id WHERE pr.purchase_id = ? AND pri.product_id = pi.product_id) as returned_quantity
      FROM purchase_items pi 
      WHERE pi.purchase_id = ?
    `).all(id, id);
    return purchase;
  },

  delete: (id) => {
    const txn = db.transaction(() => {
      const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
      if (!purchase) return { success: false, error: 'Purchase not found' };

      const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(id);

      // 1. Reverse Stock (Decrease what was added, minus what was returned)
      const reduceStock = db.prepare('UPDATE products SET quantity = MAX(0, quantity - ?) WHERE id = ?');
      for (const item of items) {
        if (item.product_id) {
          const returnedQty = db.prepare(`
            SELECT COALESCE(SUM(pri.quantity), 0) as qty 
            FROM purchase_return_items pri
            JOIN purchase_returns pr ON pri.purchase_return_id = pr.id
            WHERE pr.purchase_id = ? AND pri.product_id = ?
          `).get(id, item.product_id).qty;

          const netToReduce = item.quantity - returnedQty;
          if (netToReduce > 0) {
            reduceStock.run(netToReduce, item.product_id);
          }
        }
      }

      // 2. Reverse Party Balance
      if (purchase.party_id) {
        // Reverse the entire purchase impact.
        db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?')
          .run(purchase.total_amount, purchase.party_id);
        
        db.prepare("DELETE FROM party_transactions WHERE type = 'Purchase' AND reference_id = ?")
          .run(id);
      }

      // 3. Delete purchase records (including returns)
      const returns = db.prepare('SELECT id FROM purchase_returns WHERE purchase_id = ?').all(id);
      for (const ret of returns) {
        db.prepare('DELETE FROM purchase_return_items WHERE purchase_return_id = ?').run(ret.id);
      }
      db.prepare('DELETE FROM purchase_returns WHERE purchase_id = ?').run(id);
      db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(id);
      db.prepare('DELETE FROM purchases WHERE id = ?').run(id);

      return { success: true };
    });

    const result = txn();
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return result;
  },

  getByDateRange: (from, to) => db.prepare(
    `SELECT * FROM purchases WHERE date(date) BETWEEN ? AND ? ORDER BY date DESC`
  ).all(from, to),
};

/* ───────── Dashboard / Stats ───────── */
const statsOps = {
  getDashboard: () => {
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    // Today's Basic Stats (NET)
    const todayReturns = db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM returns WHERE date(date) = ?`).get(today);
    
    const todaySalesRaw = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM sales WHERE date(date) = ?`
    ).get(today);

    // Rollback effect: Net Total and Net Count
    const todaySalesTotal = todaySalesRaw.total - todayReturns.total;
    const todaySalesCount = Math.max(0, todaySalesRaw.count - todayReturns.count);

    const todaySales = { total: todaySalesTotal, count: todaySalesCount };
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_deleted = 0').get().count;
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_deleted = 0 AND quantity <= 10 AND quantity >= 0').get().count;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];
    const expiring = db.prepare(
      `SELECT COUNT(*) as count FROM products WHERE expiry_date != '' AND expiry_date <= ?`
    ).get(dateStr).count;

    const receivable = db.prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM parties WHERE current_balance > 0.1').get().total;
    const payable = Math.abs(db.prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM parties WHERE current_balance < -0.1').get().total);

    const totalSales = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales').get().total;
    const totalReturns = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM returns').get().total;
    const totalRevenue = totalSales - totalReturns;

    const totalSalesCash = db.prepare('SELECT COALESCE(SUM(paid_amount), 0) as total FROM sales').get().total;
    const totalPartyCash = db.prepare("SELECT COALESCE(SUM(paid_amount), 0) as total FROM party_transactions WHERE type = 'Payment'").get().total;
    const totalCashReceived = totalSalesCash + totalPartyCash;

    // Today's Breakdown - RECONCILED
    // 1. All Cash received today (Sales + Ledger Collections)
    const todaySalesCash = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total FROM sales 
      WHERE date(date) = ? AND payment_mode = 'Cash'
    `).get(today).total;

    const todayPartyCash = db.prepare(`
      SELECT COALESCE(SUM(pt.paid_amount), 0) as total 
      FROM party_transactions pt
      JOIN parties p ON pt.party_id = p.id
      WHERE date(pt.date) = ? AND pt.type = 'Payment' AND pt.payment_mode = 'Cash' AND p.type = 'Customer'
    `).get(today).total;

    // Net Cash/Digital Inflow (Subtract returns based on original payment mode)
    const todayCashReturns = db.prepare(`
      SELECT COALESCE(SUM(r.total_amount), 0) as total 
      FROM returns r 
      JOIN sales s ON r.sale_id = s.id 
      WHERE date(r.date) = ? AND s.payment_mode = 'Cash'
    `).get(today).total;

    const todayDigitalReturns = db.prepare(`
      SELECT COALESCE(SUM(r.total_amount), 0) as total 
      FROM returns r 
      JOIN sales s ON r.sale_id = s.id 
      WHERE date(r.date) = ? AND s.payment_mode != 'Cash'
    `).get(today).total;

    const todaySalesDigital = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total FROM sales 
      WHERE date(date) = ? AND payment_mode != 'Cash'
    `).get(today).total;

    const todayPartyDigital = db.prepare(`
      SELECT COALESCE(SUM(pt.paid_amount), 0) as total 
      FROM party_transactions pt
      JOIN parties p ON pt.party_id = p.id
      WHERE date(pt.date) = ? AND pt.type = 'Payment' AND pt.payment_mode != 'Cash' AND p.type = 'Customer'
    `).get(today).total;

    const todayCash = Math.max(0, (todaySalesCash + todayPartyCash) - todayCashReturns);
    const todayDigital = Math.max(0, (todaySalesDigital + todayPartyDigital) - todayDigitalReturns);

    // 3. Today's Credit (Net change in customer outstandings)
    // Formula: (New Dues created today) - (Payments received today) - (Sales Returns today)
    const todayNetCredit = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN pt.type = 'Sale' THEN pt.due_amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN pt.type = 'Payment' THEN pt.paid_amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN pt.type = 'Sales Return' THEN pt.total_amount ELSE 0 END), 0)
      AS net_change
      FROM party_transactions pt
      JOIN parties p ON pt.party_id = p.id
      WHERE date(pt.date) = ? AND p.type = 'Customer'
    `).get(today).net_change;

    const todayCredit = todayNetCredit;
    
    // Profit Calculations
    const salesMargin = db.prepare(`
      SELECT COALESCE(SUM((COALESCE(si.price, 0) - COALESCE(p.cost_price, 0)) * COALESCE(si.quantity, 0)), 0) as profit 
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
    `).get().profit;

    const returnMargin = db.prepare(`
      SELECT COALESCE(SUM((COALESCE(ri.price, 0) - COALESCE(p.cost_price, 0)) * COALESCE(ri.quantity, 0)), 0) as margin
      FROM return_items ri
      JOIN products p ON ri.product_id = p.id
    `).get().margin;

    const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
    const inventoryValue = db.prepare('SELECT COALESCE(SUM(quantity * cost_price), 0) as total FROM products WHERE is_deleted = 0').get().total;

    return {
      todaySalesTotal: todaySales.total,
      todaySalesCount: todaySales.count,
      totalProducts,
      lowStockCount: lowStock,
      expiringCount: expiring,
      receivable,
      payable,
      totalRevenue,
      totalCashReceived,
      todayCash,
      todayDigital,
      todayCredit,
      totalProfit: (salesMargin - returnMargin) - totalExpenses,
      totalExpenses,
      inventoryValue,
      recentSales: db.prepare(`
        SELECT s.*, p.name as customer_name,
               (SELECT COALESCE(SUM(total_amount), 0) FROM returns WHERE sale_id = s.id) as returned_total
        FROM sales s
        LEFT JOIN parties p ON s.party_id = p.id
        ORDER BY s.date DESC LIMIT 5
      `).all().map(s => ({
        ...s,
        total_amount: s.total_amount - (s.returned_total || 0)
      }))
    };
  },

  getMonthlyStats: () => {
    const currentYear = new Date().getFullYear().toString();
    
    // Monthly Sales
    const sales = db.prepare(`
      SELECT 
        strftime('%m', date) as month,
        (
          COALESCE(SUM(total_amount), 0) - 
          COALESCE((SELECT SUM(total_amount) FROM returns WHERE strftime('%m', date) = strftime('%m', sales.date) AND strftime('%Y', date) = ?), 0)
        ) as total_sales,
        COUNT(*) as count
      FROM sales 
      WHERE strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month ASC
    `).all(currentYear, currentYear);

    // Monthly Purchases
    const purchases = db.prepare(`
      SELECT 
        strftime('%m', date) as month,
        SUM(total_amount) as total_purchases
      FROM purchases 
      WHERE strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month ASC
    `).all(currentYear);

    // Monthly Expenses
    const expenses = db.prepare(`
      SELECT 
        strftime('%m', date) as month,
        SUM(amount) as total_expenses
      FROM expenses 
      WHERE strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month ASC
    `).all(currentYear);

    // Merge them
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return months.map((m, idx) => {
      const s = sales.find(x => x.month === m);
      const p = purchases.find(x => x.month === m);
      const e = expenses.find(x => x.month === m);

      const totalSales = s ? s.total_sales : 0;
      const totalPurchases = p ? p.total_purchases : 0;
      const totalExpenses = e ? e.total_expenses : 0;

      const salesMargin = db.prepare(`
        SELECT COALESCE(SUM((si.price - si.cost_price) * si.quantity), 0) as margin
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE strftime('%m', s.date) = ? AND strftime('%Y', s.date) = ?
      `).get(m, currentYear).margin;

      const netMargin = salesMargin;

      return {
        month: monthNames[idx],
        monthNum: m,
        sales: totalSales,
        salesCount: s ? s.count : 0,
        purchases: totalPurchases,
        expenses: totalExpenses,
        profit: netMargin - totalExpenses
      };
    });
  },

  getAiSnapshot: () => {
    const last30Days = db.prepare(`
      SELECT date(date) as day, SUM(total_amount) as total 
      FROM sales 
      WHERE date(date) > date('now', '-30 days')
      GROUP BY day ORDER BY day ASC
    `).all();

      const topProducts = db.prepare(`
        SELECT product_name, SUM(quantity) as total_qty, SUM(total_price) as revenue
        FROM sale_items
        GROUP BY product_name
        ORDER BY total_qty DESC
        LIMIT 5
      `).all();

    let lowStock = [];
    try {
      lowStock = db.prepare(`
        SELECT product_name, quantity, min_stock_alert 
        FROM products 
        WHERE quantity <= min_stock_alert AND is_deleted = 0
      `).all();
    } catch (e) {
      console.warn("Low stock query failed (migration might be pending):", e.message);
      // Fallback query without the missing column
      lowStock = db.prepare(`
        SELECT product_name, quantity, 0 as min_stock_alert 
        FROM products 
        WHERE quantity <= 10 AND is_deleted = 0
      `).all();
    }

    const overdueParties = db.prepare(`
      SELECT name, current_balance 
      FROM parties 
      WHERE current_balance > 0 AND type = 'Customer'
      ORDER BY current_balance DESC LIMIT 5
    `).all();

    return { last30Days, topProducts, lowStock, overdueParties };
  },
};

/* ───────── Expense Ops ───────── */
const expenseOps = {
  getAll: () => db.prepare('SELECT * FROM expenses ORDER BY date DESC').all(),
  add: (e) => {
    const res = db.prepare(`INSERT INTO expenses (category, description, amount) VALUES (?, ?, ?)`).run(e.category, e.description || '', e.amount);
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return res;
  },
  delete: (id) => {
    const res = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return res;
  },
};

/* ───────── Reports ───────── */


const reportOps = {
  salesReport: (from, to) => {
    const sales = db.prepare(
      `SELECT s.*, p.name as customer_name, p.phone as customer_phone,
              (SELECT COALESCE(SUM(total_amount), 0) FROM returns WHERE sale_id = s.id) as returned_total
       FROM sales s 
       LEFT JOIN parties p ON s.party_id = p.id
       WHERE date(s.date) BETWEEN ? AND ? 
       ORDER BY s.date DESC`
    ).all(from, to);
    const expensesSummary = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date(date) BETWEEN ? AND ?`
    ).get(from, to);

    const summary = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count,
              COALESCE(SUM(total_gst), 0) as gst, COALESCE(SUM(total_discount), 0) as discount,
              COALESCE(SUM(paid_amount), 0) as sales_cash
       FROM sales WHERE date(date) BETWEEN ? AND ?`
    ).get(from, to);

    const partyCollections = db.prepare(
      `SELECT COALESCE(SUM(paid_amount), 0) as total 
       FROM party_transactions 
       WHERE type = 'Payment' AND date(date) BETWEEN ? AND ?`
    ).get(from, to).total;

    const margin = db.prepare(`
      SELECT COALESCE(SUM((COALESCE(si.price, 0) - COALESCE(si.cost_price, 0)) * COALESCE(si.quantity, 0)), 0) as margin
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE date(s.date) BETWEEN ? AND ?
    `).get(from, to).margin;

    const returnsTotal = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM returns WHERE date(date) BETWEEN ? AND ?`
    ).get(from, to).total;

    const returnMargin = db.prepare(`
      SELECT COALESCE(SUM((ri.price - COALESCE(p.cost_price, 0)) * ri.quantity), 0) as margin
      FROM return_items ri
      JOIN returns r ON ri.return_id = r.id
      JOIN products p ON ri.product_id = p.id
      WHERE date(r.date) BETWEEN ? AND ?
    `).get(from, to).margin;

    const netMargin = margin - returnMargin;

    return { 
      sales, 
      summary: { 
        ...summary, 
        total: summary.total - returnsTotal,
        returns: returnsTotal,
        cash_received: summary.sales_cash + partyCollections,
        party_collections: partyCollections,
        gross_margin: netMargin,
        profit: netMargin - (expensesSummary.total || 0),
        expenses: expensesSummary.total 
      } 
    };
  },

  purchaseReport: (from, to) => {
    const purchases = db.prepare(
      `SELECT p.*, pt.name as supplier_name
       FROM purchases p 
       LEFT JOIN parties pt ON p.party_id = pt.id
       WHERE date(p.date) BETWEEN ? AND ? 
       ORDER BY p.date DESC`
    ).all(from, to);
    const summary = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
       FROM purchases WHERE date(date) BETWEEN ? AND ?`
    ).get(from, to);
    return { purchases, summary };
  },

  stockReport: () => {
    return db.prepare(
      `SELECT id, product_name, brand, category, quantity, selling_price, batch_number, expiry_date
       FROM products ORDER BY product_name ASC`
    ).all();
  },
};

/* ───────── Return Ops ───────── */
const returnOps = {
  createSaleReturn: (data) => {
    const txn = db.transaction(() => {
      // 1. Insert into returns table
      // 1. Validate remaining returnable quantity
      for (const item of data.items) {
        const soldItem = db.prepare('SELECT quantity FROM sale_items WHERE sale_id = ? AND product_id = ?')
          .get(data.sale_id, item.product_id);
        
        const alreadyReturned = db.prepare(`
          SELECT COALESCE(SUM(ri.quantity), 0) as qty 
          FROM return_items ri
          JOIN returns r ON ri.return_id = r.id
          WHERE r.sale_id = ? AND ri.product_id = ?
        `).get(data.sale_id, item.product_id).qty;

        const remaining = (soldItem?.quantity || 0) - alreadyReturned;
        if (item.quantity > remaining) {
          throw new Error(`Cannot return ${item.quantity} of ${item.product_name}. Only ${remaining} remaining.`);
        }
      }

      const info = db.prepare(`
        INSERT INTO returns (sale_id, party_id, total_amount, reason)
        VALUES (?, ?, ?, ?)
      `).run(data.sale_id || null, data.party_id || null, data.total_amount, data.reason || '');
      
      const returnId = info.lastInsertRowid;

      // 2. Insert items and update stock
      const insertItem = db.prepare(`
        INSERT INTO return_items (return_id, product_id, product_name, quantity, price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const addStock = db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?');

      for (const item of data.items) {
        let pName = item.product_name;
        if (!pName && item.product_id) {
          const p = db.prepare('SELECT product_name FROM products WHERE id = ?').get(item.product_id);
          pName = p?.product_name || 'Unknown Product';
        }
        insertItem.run(returnId, item.product_id, pName, item.quantity, item.price, item.quantity * item.price);
        addStock.run(item.quantity, item.product_id);
      }

      // 3. Update Party Balance and Record Ledger
      if (data.party_id) {
        // For Sales Return, we owe the customer back or their debt decreases
        db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ?')
          .run(data.total_amount, data.party_id);

        db.prepare(`
          INSERT INTO party_transactions (party_id, type, reference_id, total_amount, note, date)
          VALUES (?, 'Sales Return', ?, ?, ?, datetime('now','localtime'))
        `).run(data.party_id, returnId, data.total_amount, `Return for Sale ID: ${data.sale_id || 'N/A'}`);
      }

      // 4. Update Original Sale Record (Reduce its due amount)
      if (data.sale_id) {
        db.prepare('UPDATE sales SET due_amount = MAX(0, due_amount - ?) WHERE id = ?')
          .run(data.total_amount, data.sale_id);
      }

      return { success: true, returnId };
    });
    
    const result = txn();

    // Trigger Cloud Sync
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) {
      syncToCloud().catch(err => console.error("Auto-Sync Failed:", err));
    }

    return result;
  },

  getAllSaleReturns: () => db.prepare(`
    SELECT r.*, s.invoice_number, p.name as customer_name 
    FROM returns r
    LEFT JOIN sales s ON r.sale_id = s.id
    LEFT JOIN parties p ON r.party_id = p.id
    ORDER BY r.date DESC
  `).all(),

  deleteSaleReturn: (id) => {
    const txn = db.transaction(() => {
      const ret = db.prepare('SELECT * FROM returns WHERE id = ?').get(id);
      if (!ret) return { success: false, error: 'Return not found' };
      
      const items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(id);

      // 1. Reverse Stock (Subtract what was returned)
      const reduceStock = db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?');
      for (const item of items) {
        reduceStock.run(item.quantity, item.product_id);
      }

      // 2. Reverse Party Balance (Increase debt)
      if (ret.party_id) {
        db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?')
          .run(ret.total_amount, ret.party_id);
        
        // Remove ledger entry
        db.prepare("DELETE FROM party_transactions WHERE type = 'Sales Return' AND reference_id = ?")
          .run(id);
      }

      // 3. Reverse Original Sale Due
      if (ret.sale_id) {
        db.prepare('UPDATE sales SET due_amount = due_amount + ? WHERE id = ?')
          .run(ret.total_amount, ret.sale_id);
      }

      // 4. Delete return records
      db.prepare('DELETE FROM return_items WHERE return_id = ?').run(id);
      db.prepare('DELETE FROM returns WHERE id = ?').run(id);

      return { success: true };
    });

    const result = txn();
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return result;
  },

  createPurchaseReturn: (data) => {
    const txn = db.transaction(() => {
      // 1. Insert into purchase_returns table
      const info = db.prepare(`
        INSERT INTO purchase_returns (purchase_id, party_id, total_amount, reason)
        VALUES (?, ?, ?, ?)
      `).run(data.purchase_id || null, data.party_id || null, data.total_amount, data.reason || '');
      
      const pReturnId = info.lastInsertRowid;

      // 2. Insert items and update stock
      const insertItem = db.prepare(`
        INSERT INTO purchase_return_items (purchase_return_id, product_id, product_name, quantity, price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      // For Purchase Return, we are sending items back, so stock decreases
      const reduceStock = db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ?`);

      for (const item of data.items) {
        let pName = item.product_name;
        if (!pName && item.product_id) {
          const p = db.prepare('SELECT product_name FROM products WHERE id = ?').get(item.product_id);
          pName = p?.product_name || 'Unknown Product';
        }
        insertItem.run(pReturnId, item.product_id, pName, item.quantity, item.price, item.quantity * item.price);
        reduceStock.run(item.quantity, item.product_id);
      }

      // 3. Update Party Balance and Record Ledger
      if (data.party_id) {
        // For Purchase Return, the supplier owes us back or our debt to them decreases
        db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?')
          .run(data.total_amount, data.party_id);

        db.prepare(`
          INSERT INTO party_transactions (party_id, type, reference_id, total_amount, note, date)
          VALUES (?, 'Purchase Return', ?, ?, ?, datetime('now','localtime'))
        `).run(data.party_id, pReturnId, data.total_amount, `Return for Purchase ID: ${data.purchase_id || 'N/A'}`);
      }

      // 4. Update Original Purchase Record (Reduce its due amount)
      if (data.purchase_id) {
        db.prepare('UPDATE purchases SET due_amount = MAX(0, due_amount - ?) WHERE id = ?')
          .run(data.total_amount, data.purchase_id);
      }

      return { success: true, pReturnId };
    });
    
    const result = txn();

    // Trigger Cloud Sync
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) {
      syncToCloud().catch(err => console.error("Auto-Sync Failed:", err));
    }

    return result;
  },

  getAllPurchaseReturns: () => db.prepare(`
    SELECT r.*, p.invoice_number as purchase_invoice, pr.name as supplier_name 
    FROM purchase_returns r
    LEFT JOIN purchases p ON r.purchase_id = p.id
    LEFT JOIN parties pr ON r.party_id = pr.id
    ORDER BY r.date DESC
  `).all(),

  deletePurchaseReturn: (id) => {
    const txn = db.transaction(() => {
      const ret = db.prepare('SELECT * FROM purchase_returns WHERE id = ?').get(id);
      if (!ret) return { success: false, error: 'Return not found' };

      const items = db.prepare('SELECT * FROM purchase_return_items WHERE purchase_return_id = ?').all(id);

      // 1. Reverse Stock (Add back what was sent back)
      const addStock = db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`);
      for (const item of items) {
        if (item.product_id) {
          addStock.run(item.quantity, item.product_id);
        } else {
          // Fallback for legacy items without IDs
          db.prepare(`UPDATE products SET quantity = quantity + ? WHERE LOWER(REPLACE(product_name, ' ', '')) = LOWER(REPLACE(?, ' ', ''))`)
            .run(item.quantity, item.product_name);
        }
      }

      // 2. Reverse Party Balance (Decrease our credit/Increase our debt)
      if (ret.party_id) {
        db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ?')
          .run(ret.total_amount, ret.party_id);
        
        db.prepare("DELETE FROM party_transactions WHERE type = 'Purchase Return' AND reference_id = ?")
          .run(id);
      }

      // 3. Reverse Original Purchase Due
      if (ret.purchase_id) {
        db.prepare('UPDATE purchases SET due_amount = due_amount + ? WHERE id = ?')
          .run(ret.total_amount, ret.purchase_id);
      }

      // 4. Delete return records
      db.prepare('DELETE FROM purchase_return_items WHERE purchase_return_id = ?').run(id);
      db.prepare('DELETE FROM purchase_returns WHERE id = ?').run(id);

      return { success: true };
    });

    const result = txn();
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return result;
  },
};


/* ───────── Configuration Ops ───────── */
const businessProfileOps = {
  get: () => db.prepare('SELECT * FROM business_profile WHERE id = 1').get(),
  update: (p) => {
    const result = db.prepare(`
      UPDATE business_profile SET 
        business_name=?, business_short=?, tagline=?, address_line1=?, address_line2=?, 
        city=?, state=?, pincode=?, phone=?, email=?, gstin=?, 
        logo_path=?, invoice_prefix=?, invoice_footer=?, currency_symbol=?, business_type=?,
        invoice_settings=?, master_data=?, bank_details=?, whatsapp_settings=?
      WHERE id=1
    `).run(
      p.business_name || '', p.business_short || '', p.tagline || '', p.address_line1 || '', p.address_line2 || '',
      p.city || '', p.state || '', p.pincode || '', p.phone || '', p.email || '', p.gstin || '',
      p.logo_path || '', p.invoice_prefix || 'INV', p.invoice_footer || '', p.currency_symbol || '₹', p.business_type || 'General',
      typeof p.invoice_settings === 'object' ? JSON.stringify(p.invoice_settings) : (p.invoice_settings || '{}'),
      typeof p.master_data === 'object' ? JSON.stringify(p.master_data) : (p.master_data || '{}'),
      p.bank_details || '',
      typeof p.whatsapp_settings === 'object' ? JSON.stringify(p.whatsapp_settings) : (p.whatsapp_settings || '{}')
    );

    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return result;
  },
};

const authOps = {
  getPassword: () => {
    const row = db.prepare('SELECT software_password FROM business_profile WHERE id = 1').get();
    return row?.software_password || '';
  },
  setPassword: (password) => {
    return db.prepare('UPDATE business_profile SET software_password = ? WHERE id = 1').run(password);
  },
  verify: (input) => {
    const actual = authOps.getPassword();
    if (!actual) return true; // If no password set, it's always verified
    return actual === input;
  }
};

const categoryOps = {
  getAll: () => db.prepare('SELECT * FROM custom_categories WHERE is_active = 1 ORDER BY sort_order, name ASC').all(),
  add: (name) => {
    const res = db.prepare('INSERT INTO custom_categories (name) VALUES (?)').run(name);
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return res;
  },
  delete: (id) => {
    const res = db.prepare('UPDATE custom_categories SET is_active = 0 WHERE id = ?').run(id);
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return res;
  },
};

const expenseCategoryOps = {
  getAll: () => db.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all(),
  add: (name) => db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(name),
  delete: (id) => db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id),
};

/* ---------- Attribute Defs Ops ---------- */
const attributeOps = {
  getAll: () => db.prepare('SELECT * FROM product_attribute_defs').all(),
  add: (attr) => db.prepare('INSERT INTO product_attribute_defs (name, type, required, options) VALUES (?, ?, ?, ?)').run(attr.name, attr.type, attr.required || 0, attr.options || '[]'),
  delete: (id) => {
    const res = db.prepare('DELETE FROM product_attribute_defs WHERE id = ?').run(id);
    const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
    if (config?.use_cloud) syncToCloud().catch(e => console.error(e));
    return res;
  }
};

/* ---------- Global Storage Ops ---------- */
const storageOps = {
  exportAll: () => {
    return {
      products: db.prepare('SELECT * FROM products').all(),
      sales: db.prepare('SELECT * FROM sales').all(),
      sale_items: db.prepare('SELECT * FROM sale_items').all(),
      purchases: db.prepare('SELECT * FROM purchases').all(),
      purchase_items: db.prepare('SELECT * FROM purchase_items').all(),
      expenses: db.prepare('SELECT * FROM expenses').all(),
      parties: db.prepare('SELECT * FROM parties').all(),
      party_transactions: db.prepare('SELECT * FROM party_transactions').all(),
      categories: db.prepare('SELECT * FROM custom_categories').all(),
      expense_categories: db.prepare('SELECT * FROM expense_categories').all(),
      attribute_defs: db.prepare('SELECT * FROM product_attribute_defs').all(),
      profile: db.prepare('SELECT * FROM business_profile LIMIT 1').get(),
    };
  },
  importAll: (data) => {
    const dynamicInsert = (table, rows) => {
      if (!rows || rows.length === 0) return;
      
      // Get current table columns
      const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
      const validCols = tableInfo.map(c => c.name);

      for (const row of rows) {
        const rowCols = Object.keys(row).filter(k => validCols.includes(k));
        const placeholders = rowCols.map(() => '?').join(', ');
        const values = rowCols.map(k => row[k]);
        
        db.prepare(`
          INSERT INTO ${table} (${rowCols.join(', ')})
          VALUES (${placeholders})
        `).run(...values);
      }
    };

    const trx = db.transaction((d) => {
      // Clear existing tables in correct order for foreign keys
      const tables = [
        'sale_items', 'purchase_items', 'party_transactions',
        'sales', 'purchases', 'products', 'parties',
        'custom_categories', 'expense_categories', 'product_attribute_defs'
      ];
      
      tables.forEach(t => db.prepare(`DELETE FROM ${t}`).run());
      db.prepare("DELETE FROM sqlite_sequence").run();

      // Import tables dynamically
      dynamicInsert('products', d.products);
      dynamicInsert('custom_categories', d.categories);
      dynamicInsert('parties', d.parties);
      dynamicInsert('party_transactions', d.party_transactions);
      dynamicInsert('sales', d.sales);
      dynamicInsert('sale_items', d.sale_items);
      dynamicInsert('purchases', d.purchases);
      dynamicInsert('purchase_items', d.purchase_items);
      dynamicInsert('product_attribute_defs', d.attribute_defs);
      dynamicInsert('expenses', d.expenses);
      dynamicInsert('expense_categories', d.expense_categories);

      // Import profile settings (row 1 only)
      if (d.profile) {
        const p = d.profile;
        const profileInfo = db.prepare(`PRAGMA table_info(business_profile)`).all();
        const validCols = profileInfo.map(c => c.name).filter(c => c !== 'id');
        
        const updates = validCols.map(c => `${c} = ?`).join(', ');
        const values = validCols.map(c => p[c]);
        
        db.prepare(`UPDATE business_profile SET ${updates} WHERE id = 1`).run(...values);
      }
    });
    
    trx(data);
    return true;
  }
};

const ensurePostgresSchema = async (cloud) => {
  // We recreate the core schema in Postgres to ensure tables exist before sync
  await cloud`
    CREATE TABLE IF NOT EXISTS products (
      id            SERIAL PRIMARY KEY,
      product_name  TEXT NOT NULL,
      brand         TEXT DEFAULT '',
      category      TEXT DEFAULT '',
      unit          TEXT DEFAULT 'pcs',
      mrp           DECIMAL DEFAULT 0,
      selling_price DECIMAL DEFAULT 0,
      cost_price    DECIMAL DEFAULT 0,
      barcode       TEXT DEFAULT '',
      gst_rate      DECIMAL DEFAULT 0,
      cgst          DECIMAL DEFAULT 0,
      sgst          DECIMAL DEFAULT 0,
      quantity      INTEGER DEFAULT 0,
      batch_number  TEXT DEFAULT '',
      expiry_date   TEXT DEFAULT '',
      product_size  TEXT DEFAULT '',
      is_deleted    INTEGER DEFAULT 0,
      custom_fields TEXT DEFAULT '{}',
      min_stock_alert INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS expenses (
      id          SERIAL PRIMARY KEY,
      date        TEXT DEFAULT CURRENT_TIMESTAMP,
      category    TEXT NOT NULL,
      description TEXT DEFAULT '',
      amount      DECIMAL NOT NULL
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS sales (
      id             SERIAL PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      date           TEXT DEFAULT CURRENT_TIMESTAMP,
      customer_name  TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      customer_address TEXT  DEFAULT '',
      subtotal       DECIMAL DEFAULT 0,
      total_gst      DECIMAL DEFAULT 0,
      misc_charges   DECIMAL DEFAULT 0,
      total_amount   DECIMAL DEFAULT 0,
      total_discount DECIMAL DEFAULT 0,
      payment_mode   TEXT DEFAULT 'Cash',
      paid_amount    DECIMAL DEFAULT 0,
      due_amount     DECIMAL DEFAULT 0,
      party_id       INTEGER
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS sale_items (
      id          SERIAL PRIMARY KEY,
      sale_id     INTEGER NOT NULL,
      product_id  INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity    INTEGER NOT NULL,
      price       DECIMAL NOT NULL,
      mrp         DECIMAL DEFAULT 0,
      cost_price  DECIMAL DEFAULT 0,
      discount    DECIMAL DEFAULT 0,
      gst_rate    DECIMAL DEFAULT 0,
      gst_amount  DECIMAL DEFAULT 0,
      total_price DECIMAL DEFAULT 0
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS purchases (
      id            SERIAL PRIMARY KEY,
      date          TEXT DEFAULT CURRENT_TIMESTAMP,
      supplier_name TEXT DEFAULT '',
      party_id      INTEGER,
      total_amount  DECIMAL DEFAULT 0,
      paid_amount   DECIMAL DEFAULT 0,
      due_amount    DECIMAL DEFAULT 0,
      other_charges DECIMAL DEFAULT 0
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id            SERIAL PRIMARY KEY,
      purchase_id   INTEGER NOT NULL,
      product_name  TEXT NOT NULL,
      quantity      INTEGER DEFAULT 0,
      price         DECIMAL DEFAULT 0,
      batch_number  TEXT DEFAULT '',
      expiry_date   TEXT DEFAULT ''
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS parties (
      id           SERIAL PRIMARY KEY,
      name         TEXT NOT NULL,
      phone        TEXT DEFAULT '',
      address      TEXT DEFAULT '',
      gstin        TEXT DEFAULT '',
      type         TEXT DEFAULT 'Customer',
      opening_balance DECIMAL DEFAULT 0,
      current_balance DECIMAL DEFAULT 0,
      created_at   TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS party_transactions (
      id            SERIAL PRIMARY KEY,
      party_id      INTEGER NOT NULL,
      type          TEXT NOT NULL,
      reference_id  INTEGER,
      total_amount  DECIMAL DEFAULT 0,
      paid_amount   DECIMAL DEFAULT 0,
      due_amount    DECIMAL DEFAULT 0,
      payment_mode  TEXT DEFAULT 'Cash',
      note          TEXT,
      date          TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS business_profile (
      id              INTEGER PRIMARY KEY,
      business_name   TEXT DEFAULT 'My Business',
      business_short  TEXT DEFAULT 'MB',
      tagline         TEXT DEFAULT 'Billing & Inventory',
      address_line1   TEXT DEFAULT '',
      address_line2   TEXT DEFAULT '',
      city            TEXT DEFAULT '',
      state           TEXT DEFAULT '',
      pincode         TEXT DEFAULT '',
      phone           TEXT DEFAULT '',
      email           TEXT DEFAULT '',
      gstin           TEXT DEFAULT '',
      logo_path       TEXT DEFAULT '',
      invoice_prefix  TEXT DEFAULT 'INV',
      invoice_footer  TEXT DEFAULT 'Thank you for your business!',
      currency_symbol TEXT DEFAULT '₹',
      business_type   TEXT DEFAULT 'General',
      invoice_settings TEXT DEFAULT '{}',
      master_data      TEXT DEFAULT '{}',
      created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
      mobile_access_code TEXT DEFAULT '',
      mobile_secret     TEXT DEFAULT '',
      bank_details      TEXT DEFAULT '',
      whatsapp_settings TEXT DEFAULT '{}',
      gemini_api_key    TEXT DEFAULT '',
      neon_db_url       TEXT DEFAULT '',
      use_cloud         INTEGER DEFAULT 0
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      sort_order    INTEGER DEFAULT 0,
      is_active     INTEGER DEFAULT 1,
      created_at    TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await cloud`
    CREATE TABLE IF NOT EXISTS product_attribute_defs (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL,
      required    INTEGER DEFAULT 0,
      options     TEXT,
      business_id INTEGER DEFAULT 1
    );
  `;

    // ADDED RETURN TABLES FOR CLOUD
    await cloud`
      CREATE TABLE IF NOT EXISTS returns (
        id            SERIAL PRIMARY KEY,
        date          TEXT DEFAULT CURRENT_TIMESTAMP,
        sale_id       INTEGER,
        party_id      INTEGER,
        total_amount  DECIMAL DEFAULT 0,
        reason        TEXT
      );
    `;
    await cloud`
      CREATE TABLE IF NOT EXISTS return_items (
        id          SERIAL PRIMARY KEY,
        return_id   INTEGER NOT NULL,
        product_id  INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity    INTEGER NOT NULL,
        price       DECIMAL NOT NULL,
        total_price DECIMAL DEFAULT 0
      );
    `;
    await cloud`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id            SERIAL PRIMARY KEY,
        date          TEXT DEFAULT CURRENT_TIMESTAMP,
        purchase_id   INTEGER,
        party_id      INTEGER,
        total_amount  DECIMAL DEFAULT 0,
        reason        TEXT
      );
    `;
    await cloud`
      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id                 SERIAL PRIMARY KEY,
        purchase_return_id INTEGER NOT NULL,
        product_name       TEXT NOT NULL,
        quantity           INTEGER NOT NULL,
        price              DECIMAL NOT NULL,
        total_price        DECIMAL DEFAULT 0
      );
    `;
  };

let isSyncing = false;
let syncQueued = false;

const syncToCloud = async () => {
  if (isSyncing) {
    syncQueued = true;
    return;
  }
  isSyncing = true;

  try {
    const config = db.prepare('SELECT neon_db_url FROM business_profile WHERE id = 1').get();
  const cloud = getSql(config?.neon_db_url);
  if (!cloud) throw new Error("Neon Cloud is not configured properly. Check your URL in Settings.");

  console.log("🚀 Starting Cloud Sync...");
  
    try {
      // Advisory lock to prevent multiple computers syncing at the same time
      await cloud`SELECT pg_advisory_lock(123456789)`;
      
      // 1. Ensure Schema Exists
      console.log("Creating/Verifying Postgres Schema...");
      await ensurePostgresSchema(cloud);

      const tables = [
        'business_profile', 'custom_categories', 'product_attribute_defs', 
        'products', 'parties', 'expenses', 'sales', 'sale_items', 
        'purchases', 'purchase_items', 'party_transactions',
        'returns', 'return_items', 'purchase_returns', 'purchase_return_items'
      ];

      // Use a single transaction for the ENTIRE sync so it's "All or Nothing"
      await cloud.begin(async cloud => {
        for (const table of tables) {
          console.log(`Syncing table: ${table}...`);
          const rows = db.prepare(`SELECT * FROM ${table}`).all();
          
          // Truncate and Re-upload
          await cloud`TRUNCATE TABLE ${cloud(table)} RESTART IDENTITY CASCADE`;
          
          if (rows.length > 0) {
            const pgColumns = await cloud`
              SELECT column_name FROM information_schema.columns 
              WHERE table_name = ${table} AND table_schema = 'public'
            `;
            const validColumns = pgColumns.map(c => c.column_name);

            const batchSize = 500;
            for (let i = 0; i < rows.length; i += batchSize) {
              const batch = rows.slice(i, i + batchSize);
              const filteredBatch = batch.map(row => {
                const filteredRow = {};
                validColumns.forEach(col => {
                  const val = row[col];
                  filteredRow[col] = (val === undefined || val === null) ? null : val;
                });
                return filteredRow;
              });

              if (filteredBatch.length > 0) {
                await cloud`INSERT INTO ${cloud(table)} ${cloud(filteredBatch)}`;
              }
            }
          }
        }
      });
      
      console.log("☁️ Cloud Sync Completed Successfully.");
    } finally {
      await cloud`SELECT pg_advisory_unlock(123456789)`;
    }
  } catch (err) {
    console.error("❌ Cloud Sync Error (Handled):", err.message);
  } finally {
    isSyncing = false;
    if (syncQueued) {
      syncQueued = false;
      setTimeout(syncToCloud, 1000); // Debounce next sync
    }
  }
};

module.exports = { 
  db,
  initDB, resetDB, productOps, saleOps, purchaseOps,
  statsOps, reportOps, expenseOps, partyOps, returnOps,
  businessProfileOps, categoryOps, expenseCategoryOps,
  attributeOps, storageOps, syncToCloud, authOps,
  mobileAccessOps: {
    get: () => {
      const row = db.prepare('SELECT mobile_access_code, mobile_secret FROM business_profile WHERE id = 1').get();
      return {
        mobile_access_code: row?.mobile_access_code || '',
        mobile_secret: row?.mobile_secret || ''
      };
    },
    generate: () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const secret = require('crypto').randomBytes(32).toString('hex');
      db.prepare('UPDATE business_profile SET mobile_access_code = ?, mobile_secret = ? WHERE id = 1').run(code, secret);
      return { mobile_access_code: code, mobile_secret: secret };
    },
    revoke: () => {
      db.prepare("UPDATE business_profile SET mobile_access_code = '', mobile_secret = '' WHERE id = 1").run();
      return { success: true };
    }
  }
};
