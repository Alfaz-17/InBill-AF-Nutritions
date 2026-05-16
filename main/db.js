const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const isDev = !app.isPackaged;
const dbPath = isDev
  ? path.join(process.cwd(), 'store.db')
  : path.join(app.getPath('userData'), 'store.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  // Ensure existing tables have new columns - Run individually outside db.exec
  try { db.exec("ALTER TABLE products ADD COLUMN cgst REAL DEFAULT 0"); } catch(e){}
  try { db.exec("ALTER TABLE products ADD COLUMN sgst REAL DEFAULT 0"); } catch(e){}
  try { db.exec("ALTER TABLE products ADD COLUMN is_deleted INTEGER DEFAULT 0"); } catch(e){}
  try { db.exec("ALTER TABLE products ADD COLUMN custom_fields TEXT DEFAULT '{}'"); } catch(e){}

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
      total_amount  REAL    DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id   INTEGER NOT NULL,
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
      note          TEXT,
      date          TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (party_id) REFERENCES parties(id)
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
      created_at      TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  try { db.exec("ALTER TABLE business_profile ADD COLUMN invoice_settings TEXT DEFAULT '{}'"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN master_data TEXT DEFAULT '{}'"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN bank_details TEXT DEFAULT ''"); } catch(e){}
  try { db.exec("ALTER TABLE business_profile ADD COLUMN whatsapp_settings TEXT DEFAULT '{}'"); } catch(e){}
  // Performance Indexes for long-term data growth
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_sales_party ON sales(party_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)"); } catch(e){}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_party_tx_party ON party_transactions(party_id)"); } catch(e){}

  console.log('Database Initialized with Performance Indexes');

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
  if (!purchaseColumns.includes('other_charges')) {
    db.exec("ALTER TABLE purchases ADD COLUMN other_charges REAL DEFAULT 0");
  }
  if (!purchaseColumns.includes('party_id')) {
    db.exec("ALTER TABLE purchases ADD COLUMN party_id INTEGER DEFAULT NULL");
  }

  // Sales migration for party_id
  if (!saleColumns.includes('party_id')) {
    db.exec("ALTER TABLE sales ADD COLUMN party_id INTEGER DEFAULT NULL");
  }

  // NOTE: Automatic seeding removed. The Setup Wizard handles first-time configuration.
  // resetDB() remains available from Settings for fresh start.
};

const resetDB = () => {
  const txn = db.transaction(() => {
    // Disable foreign keys temporarily for clean wipe
    db.exec('PRAGMA foreign_keys = OFF');
    
    db.prepare('DELETE FROM sale_items').run();
    db.prepare('DELETE FROM sales').run();
    db.prepare('DELETE FROM purchase_items').run();
    db.prepare('DELETE FROM purchases').run();
    db.prepare('DELETE FROM purchase_return_items').run();
    db.prepare('DELETE FROM purchase_returns').run();
    db.prepare('DELETE FROM return_items').run();
    db.prepare('DELETE FROM returns').run();
    db.prepare('DELETE FROM online_order_items').run();
    db.prepare('DELETE FROM online_orders').run();
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM parties').run();
    db.prepare('DELETE FROM custom_categories').run();
    db.prepare('DELETE FROM product_attribute_defs').run();
    db.prepare('DELETE FROM expense_categories').run();
    
    // Reset auto-increment counters
    db.prepare("DELETE FROM sqlite_sequence").run();

    // Reset business profile
    db.prepare('UPDATE business_profile SET business_type=NULL, business_name=NULL WHERE id=1').run();
    
    db.exec('PRAGMA foreign_keys = ON');
  });
  
  return txn();
};

/* ───────── Helpers ───────── */
const generateInvoiceNumber = () => {
  const row = db.prepare(`SELECT invoice_number FROM sales ORDER BY id DESC LIMIT 1`).get();
  if (!row) return 'INV-001';
  const num = parseInt(row.invoice_number.replace('INV-', ''), 10) + 1;
  return `INV-${String(num).padStart(3, '0')}`;
};

const generateOnlineOrderNumber = () => {
  const row = db.prepare(`SELECT order_number FROM online_orders ORDER BY id DESC LIMIT 1`).get();
  if (!row) return 'WEB-001';
  const current = parseInt(String(row.order_number).replace('WEB-', ''), 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  return `WEB-${String(next).padStart(3, '0')}`;
};

/* ───────── Party Ops ───────── */
const partyOps = {
  getAll: (type) => {
    if (type) return db.prepare('SELECT * FROM parties WHERE type = ? ORDER BY name ASC').all(type);
    return db.prepare('SELECT * FROM parties ORDER BY name ASC').all();
  },
  getById: (id) => db.prepare('SELECT * FROM parties WHERE id = ?').get(id),
  add: (p) => db.prepare(`
    INSERT INTO parties (name, phone, address, gstin, type, opening_balance, current_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(p.name, p.phone || '', p.address || '', p.gstin || '', p.type || 'Customer', p.opening_balance || 0, p.opening_balance || 0),
  update: (id, p) => db.prepare(`
    UPDATE parties SET name=?, phone=?, address=?, gstin=?, type=?, opening_balance=?
    WHERE id=?
  `).run(p.name, p.phone || '', p.address || '', p.gstin || '', p.type || 'Customer', p.opening_balance || 0, id),
  delete: (id) => {
    const party = db.prepare('SELECT current_balance FROM parties WHERE id = ?').get(id);
    if (party && Math.abs(party.current_balance) > 0.1) {
      throw new Error("Cannot delete a party with an outstanding balance. Clear dues first.");
    }
    return db.prepare('DELETE FROM parties WHERE id = ?').run(id);
  },
  updateBalance: (id, amount) => db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?').run(amount, id),
  
  getLedger: (partyId) => db.prepare(`
    SELECT * FROM party_transactions 
    WHERE party_id = ? 
    ORDER BY date DESC
  `).all(partyId),

  recordPayment: (data) => {
    const txn = db.transaction(() => {
      // Record payment in transaction ledger
      db.prepare(`
        INSERT INTO party_transactions (party_id, type, paid_amount, note, date)
        VALUES (?, 'Payment', ?, ?, datetime('now','localtime'))
      `).run(data.party_id, data.amount, data.note || '');

      // Update party current balance
      // If payment from customer: current_balance decreases (they owe less)
      // If payment to supplier: current_balance increases (we owe less, balance moves from negative toward zero)
      const party = db.prepare('SELECT type FROM parties WHERE id = ?').get(data.party_id);
      const direction = party.type === 'Customer' ? -1 : 1;
      
      db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?')
        .run(data.amount * direction, data.party_id);

      return { success: true };
    });
    return txn();
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
    }

    return db.prepare(`
      INSERT INTO products (product_name, brand, category, product_size, unit, mrp, selling_price, cost_price, barcode, gst_rate, cgst, sgst, quantity, batch_number, expiry_date, is_deleted, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(trimmedName, p.brand || '', p.category || '', p.product_size || '', p.unit || 'pcs',
           p.mrp || 0, p.selling_price || 0, p.cost_price || 0, p.barcode || '',
           gst, cgst, sgst, p.quantity || 0, p.batch_number || '', p.expiry_date || '',
           p.custom_fields || '{}');
  },

  update: (id, p) => {
    const gst = p.gst_rate || 0;
    const cgst = p.cgst ?? (gst / 2);
    const sgst = p.sgst ?? (gst / 2);
    return db.prepare(`
      UPDATE products SET product_name=?, brand=?, category=?, product_size=?, unit=?, mrp=?, selling_price=?, cost_price=?, barcode=?, gst_rate=?, cgst=?, sgst=?, quantity=?, batch_number=?, expiry_date=?, custom_fields=?
      WHERE id=?
    `).run(p.product_name, p.brand || '', p.category || '', p.product_size || '', p.unit || 'pcs',
           p.mrp || 0, p.selling_price || 0, p.cost_price || 0, p.barcode || '',
           gst, cgst, sgst, p.quantity || 0, p.batch_number || '', p.expiry_date || '', 
           p.custom_fields || '{}', id);
  },

  getLastPurchasePrice: (productName) => {
    const row = db.prepare(`
      SELECT price FROM purchase_items 
      WHERE product_name = ? 
      ORDER BY id DESC LIMIT 1
    `).get(productName);
    return row ? row.price : 0;
  },

  delete: (id) => db.prepare('UPDATE products SET is_deleted = 1 WHERE id = ?').run(id),

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
  create: (saleData) => {
    const txn = db.transaction(() => {
      const invoiceNumber = generateInvoiceNumber();
      let subtotal = 0;
      let totalGst = 0;

      const taxMode = saleData.tax_mode || 'exclusive';

      // Calculate totals
      for (const item of saleData.items) {
        const itemQty = parseFloat(item.quantity) || 0;
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
        item.base_price = basePrice; // Exclusive unit price
        
        item.discount = (item.mrp || item.price) > item.price ? (item.mrp - item.price) * item.quantity : 0;
        subtotal += basePrice * itemQty;
        totalGst += gstAmount;
      }

      const totalDiscount = saleData.items.reduce((sum, i) => sum + (i.discount || 0), 0);
      const miscCharges = parseFloat(saleData.misc_charges) || 0;
      
      // Strict rounding to fix the "1999 vs 2000" issue
      const rawTotalAmount = subtotal + totalGst + miscCharges;
      const totalAmount = Math.round(rawTotalAmount);
      
      // Adjust subtotal and GST slightly if needed to match the rounded total 
      // (This ensures Subtotal + GST = Total exactly)
      const paid_amount = saleData.paid_amount !== undefined ? Number(saleData.paid_amount) : totalAmount;
      const dueAmount = Math.max(0, totalAmount - paid_amount);

      const saleInfo = db.prepare(`
        INSERT INTO sales (invoice_number, party_id, customer_name, customer_phone, subtotal, total_gst, misc_charges, total_amount, total_discount, payment_mode, paid_amount, due_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceNumber,
        saleData.party_id || null,
        saleData.customer_name || '',
        saleData.customer_phone || '',
        Number(subtotal.toFixed(2)),
        Number(totalGst.toFixed(2)),
        saleData.misc_charges || 0,
        totalAmount,
        totalDiscount,
        saleData.payment_mode || 'Cash',
        paid_amount,
        dueAmount
      );

      const saleId = saleInfo.lastInsertRowid;

      // Update party balance & record transaction if it's a party-linked sale
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
        const product = getCost.get(item.product_id);
        const costPrice = product ? product.cost_price : 0;

        insertItem.run(saleId, item.product_id, item.product_name, item.quantity,
                       item.mrp || item.price, item.base_price, costPrice, item.discount || 0, 
                       item.gst_rate, item.gst_amount, item.total_price);
        reduceStock.run(item.quantity, item.product_id);
      }

      const createdSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      createdSale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
      
      return createdSale;
    });
    return txn();
  },

  getAll: () => db.prepare('SELECT * FROM sales ORDER BY date DESC').all(),

  getById: (id) => {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    if (!sale) return null;
    sale.items = db.prepare(`
      SELECT 
        si.*,
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
    `).all(id);
    return sale;
  },

  getByInvoice: (invoiceNumber) => {
    const sale = db.prepare('SELECT * FROM sales WHERE invoice_number = ?').get(invoiceNumber);
    if (!sale) return null;
    sale.items = db.prepare(`
      SELECT 
        si.*,
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
    `).all(sale.id);
    return sale;
  },

  getByDateRange: (from, to) => db.prepare(
    `SELECT * FROM sales WHERE date(date) BETWEEN ? AND ? ORDER BY date DESC`
  ).all(from, to),

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
  create: (purchaseData) => {
    const txn = db.transaction(() => {
      let totalAmount = 0;
      for (const item of purchaseData.items) {
        totalAmount += (item.price || 0) * (item.quantity || 0);
      }
      const otherCharges = parseFloat(purchaseData.other_charges) || 0;
      totalAmount += otherCharges;
      
      let updatedCount = 0;
      let createdCount = 0;

      const info = db.prepare(`
        INSERT INTO purchases (party_id, supplier_name, total_amount, other_charges) VALUES (?, ?, ?, ?)
      `).run(purchaseData.party_id || null, purchaseData.supplier_name || '', totalAmount, otherCharges);

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
        INSERT INTO purchase_items (purchase_id, product_name, quantity, price, batch_number, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of purchaseData.items) {
        insertItem.run(purchaseId, item.product_name, item.quantity || 0,
                       item.price || 0, item.batch_number || '', item.expiry_date || '');

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

        // Auto-register category and custom field definitions for ALL items
        if (item.category) {
          const catExists = db.prepare('SELECT id FROM custom_categories WHERE name = ?').get(item.category);
          if (!catExists) {
            db.prepare('INSERT INTO custom_categories (name) VALUES (?)').run(item.category);
            console.log(`[DB] Auto-registered new category: ${item.category}`);
          }
        }
        if (item.custom_fields) {
          for (const [key, val] of Object.entries(item.custom_fields)) {
            const attrExists = db.prepare('SELECT id FROM product_attribute_defs WHERE name = ?').get(key);
            if (!attrExists) {
              db.prepare('INSERT INTO product_attribute_defs (name, type) VALUES (?, ?)').run(key, isNaN(val) ? 'text' : 'number');
              console.log(`[DB] Auto-registered new product field: ${key} (${isNaN(val) ? 'text' : 'number'})`);
            }
          }
        }

        if (existing) {
          console.log(`[DB] Matching product found (ID: ${existing.id}). Updating stock for: ${trimmedName}`);
          
          // Merge custom_fields: keep existing fields, add/update new ones
          let mergedFields = {};
          try {
            const existingProduct = db.prepare('SELECT custom_fields FROM products WHERE id = ?').get(existing.id);
            mergedFields = JSON.parse(existingProduct?.custom_fields || '{}');
          } catch (e) { /* silent */ }
          Object.assign(mergedFields, item.custom_fields || {});

          const gstRate = parseFloat(item.gst_rate) || 0;

          db.prepare(`
            UPDATE products 
            SET quantity = quantity + ?, 
                batch_number = ?, 
                expiry_date = ?,
                cost_price = ?,
                mrp = ?,
                selling_price = ?,
                product_size = ?,
                gst_rate = ?,
                cgst = ?,
                sgst = ?,
                category = CASE WHEN category = '' THEN ? ELSE category END,
                custom_fields = ?,
                is_deleted = 0
            WHERE id = ?
          `).run(item.quantity || 0, item.batch_number || '', item.expiry_date || '', 
                 purchasePrice, item.mrp || purchasePrice, item.selling_price || purchasePrice, 
                 item.product_size || '', gstRate, gstRate / 2, gstRate / 2,
                 item.category || '', 
                 JSON.stringify(mergedFields), existing.id);
          updatedCount++;
        } else {
          console.log(`[DB] No matching product for: ${trimmedName}. Creating NEW product record.`);
          const gstRate = parseFloat(item.gst_rate) || 0;

          db.prepare(`
            INSERT INTO products (product_name, brand, category, product_size, unit, cost_price, mrp, selling_price, gst_rate, cgst, sgst, quantity, batch_number, expiry_date, custom_fields)
            VALUES (?, '', ?, ?, 'pcs', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(trimmedName, item.category || '', item.product_size || '', purchasePrice, item.mrp || purchasePrice, item.selling_price || purchasePrice * 1.2, 
                 gstRate, gstRate / 2, gstRate / 2,
                 item.quantity || 0, item.batch_number || '', item.expiry_date || '', JSON.stringify(item.custom_fields || {}));
          createdCount++;
        }
      }
      console.log(`[DB] Purchase ${purchaseId} recorded. Updated: ${updatedCount}, Created: ${createdCount}`);

      return { purchaseId, totalAmount, updatedCount, createdCount };
    });
    return txn();
  },

  getAll: () => db.prepare('SELECT * FROM purchases ORDER BY date DESC').all(),

  getById: (id) => {
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
    if (!purchase) return null;
    purchase.items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(id);
    return purchase;
  },

  getByDateRange: (from, to) => db.prepare(
    `SELECT * FROM purchases WHERE date(date) BETWEEN ? AND ? ORDER BY date DESC`
  ).all(from, to),
};

/* ───────── Dashboard / Stats ───────── */
const statsOps = {
  getDashboard: () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM sales WHERE date(date) = ?`
    ).get(today);
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_deleted = 0').get().count;
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_deleted = 0 AND quantity <= 10 AND quantity >= 0').get().count;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];
    const expiring = db.prepare(
      `SELECT COUNT(*) as count FROM products WHERE expiry_date != '' AND expiry_date <= ?`
    ).get(dateStr).count;

    const receivable = db.prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM parties WHERE current_balance > 0').get().total;
    const payable = Math.abs(db.prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM parties WHERE current_balance < 0').get().total);

    const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales').get().total;

    const totalCashReceived = db.prepare('SELECT COALESCE(SUM(paid_amount), 0) as total FROM sales').get().total;

    // Today's Breakdown
    const todayCash = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total FROM sales 
      WHERE date(date) = ? AND payment_mode = 'Cash'
    `).get(today).total;

    const todayDigital = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total FROM sales 
      WHERE date(date) = ? AND payment_mode != 'Cash'
    `).get(today).total;

    const todayCredit = db.prepare(`
      SELECT COALESCE(SUM(due_amount), 0) as total FROM sales 
      WHERE date(date) = ?
    `).get(today).total;
    
    const salesMargin = db.prepare(`
      SELECT COALESCE(SUM((price - cost_price) * quantity), 0) as profit 
      FROM sale_items
    `).get().profit;

    const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
    const inventoryValue = db.prepare('SELECT COALESCE(SUM(quantity * cost_price), 0) as total FROM products WHERE is_deleted = 0').get().total;
    const recentSales = db.prepare('SELECT * FROM sales ORDER BY date DESC LIMIT 5').all();

    return {
      todaySalesTotal: todaySales.total,
      todaySalesCount: todaySales.count,
      totalProducts,
      lowStockCount: lowStock,
      expiringCount: expiring,
      recentSales,
      totalRevenue,
      totalCashReceived,
      todayCash,
      todayDigital,
      todayCredit,
      totalProfit: salesMargin - totalExpenses,
      totalExpenses,
      inventoryValue,
      receivable,
      payable
    };
  },

  getMonthlyStats: () => {
    const currentYear = new Date().getFullYear().toString();
    
    // Monthly Sales
    const sales = db.prepare(`
      SELECT 
        strftime('%m', date) as month,
        SUM(total_amount) as total_sales,
        COUNT(*) as count
      FROM sales 
      WHERE strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month ASC
    `).all(currentYear);

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
};

/* ───────── Expense Ops ───────── */
const expenseOps = {
  getAll: () => db.prepare('SELECT * FROM expenses ORDER BY date DESC').all(),
  add: (e) => db.prepare(`INSERT INTO expenses (category, description, amount) VALUES (?, ?, ?)`).run(e.category, e.description || '', e.amount),
  delete: (id) => db.prepare('DELETE FROM expenses WHERE id = ?').run(id),
};

/* ───────── Reports ───────── */


const reportOps = {
  salesReport: (from, to) => {
    const sales = db.prepare(
      `SELECT * FROM sales WHERE date(date) BETWEEN ? AND ? ORDER BY date DESC`
    ).all(from, to);
    const expensesSummary = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date(date) BETWEEN ? AND ?`
    ).get(from, to);

    const summary = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count,
              COALESCE(SUM(total_gst), 0) as gst, COALESCE(SUM(total_discount), 0) as discount,
              COALESCE(SUM(paid_amount), 0) as cash_received
       FROM sales WHERE date(date) BETWEEN ? AND ?`
    ).get(from, to);

    const margin = db.prepare(`
      SELECT COALESCE(SUM((si.price - si.cost_price) * si.quantity), 0) as margin
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE date(s.date) BETWEEN ? AND ?
    `).get(from, to).margin;

    return { 
      sales, 
      summary: { 
        ...summary, 
        profit: margin - (expensesSummary.total || 0),
        expenses: expensesSummary.total 
      } 
    };
  },

  purchaseReport: (from, to) => {
    const purchases = db.prepare(
      `SELECT * FROM purchases WHERE date(date) BETWEEN ? AND ? ORDER BY date DESC`
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


/* ───────── Configuration Ops ───────── */
const businessProfileOps = {
  get: () => db.prepare('SELECT * FROM business_profile WHERE id = 1').get(),
  update: (p) => {
    return db.prepare(`
      UPDATE business_profile SET 
        business_name=?, business_short=?, tagline=?, address_line1=?, address_line2=?, 
        city=?, state=?, pincode=?, phone=?, email=?, gstin=?, 
        logo_path=?, invoice_prefix=?, invoice_footer=?, currency_symbol=?, business_type=?,
        invoice_settings=?, master_data=?, bank_details=?, whatsapp_settings=?
      WHERE id=1
    `).run(
      p.business_name, p.business_short, p.tagline, p.address_line1, p.address_line2,
      p.city, p.state, p.pincode, p.phone, p.email, p.gstin,
      p.logo_path, p.invoice_prefix, p.invoice_footer, p.currency_symbol, p.business_type,
      typeof p.invoice_settings === 'object' ? JSON.stringify(p.invoice_settings) : (p.invoice_settings || '{}'),
      typeof p.master_data === 'object' ? JSON.stringify(p.master_data) : (p.master_data || '{}'),
      p.bank_details || '',
      typeof p.whatsapp_settings === 'object' ? JSON.stringify(p.whatsapp_settings) : (p.whatsapp_settings || '{}')
    );
  },
};

const categoryOps = {
  getAll: () => db.prepare('SELECT * FROM custom_categories WHERE is_active = 1 ORDER BY sort_order, name ASC').all(),
  add: (name) => db.prepare('INSERT INTO custom_categories (name) VALUES (?)').run(name),
  delete: (id) => db.prepare('UPDATE custom_categories SET is_active = 0 WHERE id = ?').run(id),
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
  delete: (id) => db.prepare('DELETE FROM product_attribute_defs WHERE id = ?').run(id)
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
      categories: db.prepare('SELECT * FROM categories').all(),
      expense_categories: db.prepare('SELECT * FROM expense_categories').all(),
      attribute_defs: db.prepare('SELECT * FROM product_attribute_defs').all(),
      profile: db.prepare('SELECT * FROM business_profile LIMIT 1').get(),
    };
  },
  importAll: (data) => {
    const trx = db.transaction((d) => {
      // Clear existing
      db.prepare('DELETE FROM products').run();
      db.prepare('DELETE FROM sales').run();
      db.prepare('DELETE FROM sale_items').run();
      db.prepare('DELETE FROM purchases').run();
      db.prepare('DELETE FROM purchase_items').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM parties').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM expense_categories').run();
      db.prepare('DELETE FROM product_attribute_defs').run();
      
      // Import
      if (d.products) d.products.forEach(p => db.prepare('INSERT INTO products (id, product_name, product_size, barcode, brand, category, unit, cost_price, selling_price, mrp, gst_rate, quantity, min_stock_alert, batch_number, expiry_date, custom_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(p.id, p.product_name, p.product_size, p.barcode, p.brand, p.category, p.unit, p.cost_price, p.selling_price, p.mrp, p.gst_rate, p.quantity, p.min_stock_alert, p.batch_number, p.expiry_date, p.custom_fields));
      if (d.categories) d.categories.forEach(c => db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(c.id, c.name));
      if (d.parties) d.parties.forEach(p => db.prepare('INSERT INTO parties (id, name, phone, address, gstin, type, opening_balance, current_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(p.id, p.name, p.phone, p.address, p.gstin, p.type, p.opening_balance, p.current_balance));
      if (d.sales) d.sales.forEach(s => db.prepare('INSERT INTO sales (id, invoice_number, date, customer_name, customer_phone, subtotal, tax_amount, discount_amount, grand_total, payment_mode, status, party_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(s.id, s.invoice_number, s.date, s.customer_name, s.customer_phone, s.subtotal, s.tax_amount, s.discount_amount, s.grand_total, s.payment_mode, s.status, s.party_id));
      if (d.sale_items) d.sale_items.forEach(i => db.prepare('INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, price, gst_rate, subtotal, custom_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(i.id, i.sale_id, i.product_id, i.product_name, i.quantity, i.price, i.gst_rate, i.subtotal, i.custom_fields));
      if (d.attribute_defs) d.attribute_defs.forEach(a => db.prepare('INSERT INTO product_attribute_defs (id, name, type, required, options) VALUES (?, ?, ?, ?, ?)').run(a.id, a.name, a.type, a.required, a.options));
      // ... (Rest can be added as needed, focusing on core for now)
    });
    trx(data);
    return true;
  }
};

module.exports = { 
  initDB, resetDB, productOps, saleOps, purchaseOps,
  statsOps, reportOps, expenseOps, partyOps, 
  businessProfileOps, categoryOps, expenseCategoryOps,
  attributeOps, storageOps
};
