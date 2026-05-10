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
      quantity      INTEGER DEFAULT 0,
      batch_number  TEXT    DEFAULT '',
      expiry_date   TEXT    DEFAULT '',
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    );

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
      subtotal       REAL    DEFAULT 0,
      total_gst      REAL    DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS returns (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id        INTEGER NOT NULL,
      invoice_number TEXT    NOT NULL,
      date           TEXT    DEFAULT (datetime('now','localtime')),
      total_refund   REAL    DEFAULT 0,
      reason         TEXT    DEFAULT '',
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id   INTEGER NOT NULL,
      product_id  INTEGER NOT NULL,
      product_name TEXT   NOT NULL,
      quantity    INTEGER NOT NULL,
      refund_amount REAL  DEFAULT 0,
      FOREIGN KEY (return_id)  REFERENCES returns(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
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
  `);

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
  if (!columns.includes('is_deleted')) {
    db.exec("ALTER TABLE products ADD COLUMN is_deleted INTEGER DEFAULT 0");
  } else {
    // Ensure any legacy NULL values are fixed
    db.exec("UPDATE products SET is_deleted = 0 WHERE is_deleted IS NULL");
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

  // Seed if empty
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    seedDB();
  }
};

const seedDB = () => {
  const productSeeds = [
    ['ON Gold Standard Whey 2kg', 'Optimum Nutrition', 'Whey Protein', 'pcs', 6500, 5800, 4800, 'ONW-001', 18, 15, 'BN-101', '2025-12-31'],
    ['MuscleTech Nitrotech 2kg', 'MuscleTech', 'Whey Protein', 'pcs', 7200, 6400, 5200, 'MTN-001', 18, 8, 'BN-102', '2025-10-15'],
    ['GNC Creatine Monohydrate 250g', 'GNC', 'Creatine', 'pcs', 1800, 1500, 950, 'GNC-001', 12, 25, 'BN-103', '2026-06-20'],
    ['HealthKart Multivitamin 60 tabs', 'HealthKart', 'Vitamins', 'pcs', 900, 750, 450, 'HKV-001', 12, 40, 'BN-104', '2025-08-10'],
    ['MuscleBlaze Biozyme Whey 1kg', 'MuscleBlaze', 'Whey Protein', 'pcs', 3200, 2800, 2100, 'MBW-001', 18, 12, 'BN-105', '2026-01-05'],
    ['BPI Sports BCAA 30 Servings', 'BPI Sports', 'Amino Acids', 'pcs', 2400, 2100, 1400, 'BPI-001', 12, 20, 'BN-106', '2025-11-20'],
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (product_name, brand, category, unit, mrp, selling_price, cost_price, barcode, gst_rate, quantity, batch_number, expiry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of productSeeds) {
    insertProduct.run(...p);
  }

  const expenseSeeds = [
    ['Rent', 'Monthly Shop Rent', 15000],
    ['Bills', 'Electricity & Water', 2500],
    ['Salary', 'Part-time staff salary', 5000],
    ['Marketing', 'Google Maps Ads', 1200],
    ['Misc', 'Water bottle supply', 450],
  ];

  const insertExpense = db.prepare(`INSERT INTO expenses (category, description, amount) VALUES (?, ?, ?)`);
  for (const e of expenseSeeds) {
    insertExpense.run(...e);
  }

  // Add some mock sales
  const salesCount = 10;
  for (let i = 0; i < salesCount; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (salesCount - i));
    const dateStr = date.toISOString().split('T')[0] + ' 12:00:00';
    
    const invoice = `INV-${String(i + 1).padStart(3, '0')}`;
    const amount = 2000 + (Math.random() * 5000);
    
    db.prepare(`
      INSERT INTO sales (invoice_number, date, customer_name, subtotal, total_gst, total_amount, payment_mode, paid_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoice, dateStr, `Demo Customer ${i + 1}`, amount * 0.85, amount * 0.15, amount, i % 2 === 0 ? 'Cash' : 'UPI', amount);
  }
};

/* ───────── Helpers ───────── */
const generateInvoiceNumber = () => {
  const row = db.prepare(`SELECT invoice_number FROM sales ORDER BY id DESC LIMIT 1`).get();
  if (!row) return 'INV-001';
  const num = parseInt(row.invoice_number.replace('INV-', ''), 10) + 1;
  return `INV-${String(num).padStart(3, '0')}`;
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
  delete: (id) => db.prepare('DELETE FROM parties WHERE id = ?').run(id),
  updateBalance: (id, amount) => db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?').run(amount, id),
};

/* ───────── Product Ops ───────── */
const productOps = {
  getAll: () => db.prepare('SELECT * FROM products WHERE COALESCE(is_deleted, 0) = 0 ORDER BY product_name ASC').all(),
  
  getById: (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id),

  search: (term) => db.prepare(
    `SELECT * FROM products WHERE COALESCE(is_deleted, 0) = 0 AND (product_name LIKE ? OR brand LIKE ? OR category LIKE ? ) ORDER BY product_name ASC`
  ).all(`%${term}%`, `%${term}%`, `%${term}%`),

  add: (p) => {
    const trimmedName = (p.product_name || '').trim();
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
          brand=?, category=?, unit=?, mrp=?, selling_price=?, cost_price=?, 
          barcode=?, gst_rate=?, quantity=?, batch_number=?, expiry_date=?,
          is_deleted=0
        WHERE id=?
      `).run(p.brand || '', p.category || '', p.unit || 'pcs',
             p.mrp || 0, p.selling_price || 0, p.cost_price || 0, p.barcode || '',
             p.gst_rate || 0, p.quantity || 0, p.batch_number || '', p.expiry_date || '', 
             existing.id);
    }

    return db.prepare(`
      INSERT INTO products (product_name, brand, category, unit, mrp, selling_price, cost_price, barcode, gst_rate, quantity, batch_number, expiry_date, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(trimmedName, p.brand || '', p.category || '', p.unit || 'pcs',
           p.mrp || 0, p.selling_price || 0, p.cost_price || 0, p.barcode || '',
           p.gst_rate || 0, p.quantity || 0, p.batch_number || '', p.expiry_date || '');
  },

  update: (id, p) => {
    return db.prepare(`
      UPDATE products SET product_name=?, brand=?, category=?, unit=?, mrp=?, selling_price=?, cost_price=?, barcode=?, gst_rate=?, quantity=?, batch_number=?, expiry_date=?
      WHERE id=?
    `).run(p.product_name, p.brand || '', p.category || '', p.unit || 'pcs',
           p.mrp || 0, p.selling_price || 0, p.cost_price || 0, p.barcode || '',
           p.gst_rate || 0, p.quantity || 0, p.batch_number || '', p.expiry_date || '', id);
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

      // Calculate totals
      for (const item of saleData.items) {
        const gstAmount = (item.price * item.quantity * item.gst_rate) / 100;
        const itemTotal = (item.price * item.quantity) + gstAmount;
        item.gst_amount = gstAmount;
        item.total_price = itemTotal;
        item.discount = (item.mrp || item.price) > item.price ? (item.mrp - item.price) * item.quantity : 0;
        subtotal += item.price * item.quantity;
        totalGst += gstAmount;
      }

      const totalDiscount = saleData.items.reduce((sum, i) => sum + (i.discount || 0), 0);
      const totalAmount = subtotal + totalGst;
      const dueAmount = totalAmount - (saleData.paid_amount || 0);

      const saleInfo = db.prepare(`
        INSERT INTO sales (invoice_number, party_id, customer_name, customer_phone, subtotal, total_gst, total_amount, total_discount, payment_mode, paid_amount, due_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceNumber,
        saleData.party_id || null,
        saleData.customer_name || '',
        saleData.customer_phone || '',
        subtotal,
        totalGst,
        totalAmount,
        totalDiscount,
        saleData.payment_mode || 'Cash',
        saleData.paid_amount || 0,
        dueAmount > 0 ? dueAmount : 0
      );

      // Update party balance if it's a credit sale
      if (saleData.party_id && dueAmount > 0) {
        db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ?').run(dueAmount, saleData.party_id);
      }

      const saleId = saleInfo.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, mrp, price, discount, gst_rate, gst_amount, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const reduceStock = db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?');

      for (const item of saleData.items) {
        insertItem.run(saleId, item.product_id, item.product_name, item.quantity,
                       item.mrp || item.price, item.price, item.discount || 0, 
                       item.gst_rate, item.gst_amount, item.total_price);
        reduceStock.run(item.quantity, item.product_id);
      }

      return { saleId, invoiceNumber, totalAmount, dueAmount: dueAmount > 0 ? dueAmount : 0 };
    });

    return txn();
  },

  getAll: () => db.prepare('SELECT * FROM sales ORDER BY date DESC').all(),

  getById: (id) => {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    if (!sale) return null;
    sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
    return sale;
  },

  getByInvoice: (invoiceNumber) => {
    const sale = db.prepare('SELECT * FROM sales WHERE invoice_number = ?').get(invoiceNumber);
    if (!sale) return null;
    sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
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

      // Update party balance for supplier (To Pay)
      if (purchaseData.party_id) {
        // Decrease balance because we now owe more money (Negative balance = Payable)
        db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ?')
          .run(totalAmount, purchaseData.party_id);
      }

      const purchaseId = info.lastInsertRowid;

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

        if (existing) {
          console.log(`[DB] Matching product found (ID: ${existing.id}). Updating stock for: ${trimmedName}`);
          db.prepare(`
            UPDATE products 
            SET quantity = quantity + ?, 
                batch_number = ?, 
                expiry_date = ?,
                cost_price = ?,
                mrp = ?,
                selling_price = ?,
                is_deleted = 0
            WHERE id = ?
          `).run(item.quantity || 0, item.batch_number || '', item.expiry_date || '', 
                 purchasePrice, item.mrp || purchasePrice, item.selling_price || purchasePrice, 
                 existing.id);
          updatedCount++;
        } else {
          console.log(`[DB] No matching product for: ${trimmedName}. Creating NEW product record.`);
          db.prepare(`
            INSERT INTO products (product_name, brand, category, unit, cost_price, mrp, selling_price, gst_rate, quantity, batch_number, expiry_date)
            VALUES (?, '', '', 'pcs', ?, ?, ?, 0, ?, ?, ?)
          `).run(trimmedName, purchasePrice, item.mrp || purchasePrice, item.selling_price || purchasePrice * 1.2, 
                 item.quantity || 0, item.batch_number || '', item.expiry_date || '');
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

/* ───────── Return Ops ───────── */
const returnOps = {
  create: (returnData) => {
    const txn = db.transaction(() => {
      let totalRefund = 0;

      for (const item of returnData.items) {
        totalRefund += item.refund_amount || 0;
      }

      const info = db.prepare(`
        INSERT INTO returns (sale_id, invoice_number, total_refund, reason)
        VALUES (?, ?, ?, ?)
      `).run(returnData.sale_id, returnData.invoice_number, totalRefund, returnData.reason || '');

      const returnId = info.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO return_items (return_id, product_id, product_name, quantity, refund_amount)
        VALUES (?, ?, ?, ?, ?)
      `);

      const increaseStock = db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?');

      for (const item of returnData.items) {
        insertItem.run(returnId, item.product_id, item.product_name, item.quantity, item.refund_amount || 0);
        increaseStock.run(item.quantity, item.product_id);
      }

      return { returnId, totalRefund };
    });
    return txn();
  },

  getAll: () => db.prepare('SELECT * FROM returns ORDER BY date DESC').all(),
};

/* ───────── Dashboard / Stats ───────── */
const statsOps = {
  getDashboard: () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM sales WHERE date(date) = ?`
    ).get(today);
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE quantity <= 10 AND quantity >= 0').get().count;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];
    const expiring = db.prepare(
      `SELECT COUNT(*) as count FROM products WHERE expiry_date != '' AND expiry_date <= ?`
    ).get(dateStr).count;

    const receivable = db.prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM parties WHERE current_balance > 0').get().total;
    const payable = Math.abs(db.prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM parties WHERE current_balance < 0').get().total);

    const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales').get().total;
    const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
    const recentSales = db.prepare('SELECT * FROM sales ORDER BY date DESC LIMIT 5').all();

    return {
      todaySalesTotal: todaySales.total,
      todaySalesCount: todaySales.count,
      totalProducts,
      lowStockCount: lowStock,
      expiringCount: expiring,
      recentSales,
      totalRevenue,
      totalExpenses,
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

    // Merge them
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return months.map((m, idx) => {
      const s = sales.find(x => x.month === m);
      const p = purchases.find(x => x.month === m);
      return {
        month: monthNames[idx],
        monthNum: m,
        sales: s ? s.total_sales : 0,
        salesCount: s ? s.count : 0,
        purchases: p ? p.total_purchases : 0,
        profit: (s ? s.total_sales : 0) - (p ? p.total_purchases : 0)
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
    const summary = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(total_gst), 0) as gst, COUNT(*) as count
       FROM sales WHERE date(date) BETWEEN ? AND ?`
    ).get(from, to);
    return { sales, summary };
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


module.exports = { initDB, seedDB, productOps, saleOps, purchaseOps, returnOps, statsOps, reportOps, expenseOps, partyOps };
