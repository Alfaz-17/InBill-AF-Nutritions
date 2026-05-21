// InBill Mobile Web Client Data Layer
// Supports standalone local offline (localStorage) and cloud-connected (Neon PostgreSQL API endpoints)

const isCloudActive = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('inbill_cloud_active') === 'true';
};

// Seed initial local storage database structures if they don't exist
const ensureLocalSeeds = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('inbill_local_profile')) {
    localStorage.setItem('inbill_local_profile', JSON.stringify({
      business_name: 'My Business PWA',
      business_short: 'MB',
      tagline: 'Billing & Inventory Offline First',
      phone: '9876543210',
      email: 'contact@mybusiness.com',
      gstin: '27AAAAA1111A1Z1',
      address_line1: '123 Main Street',
      address_line2: 'Business Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      currency_symbol: '₹',
      terms_and_conditions: '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.',
      whatsapp_number: '9876543210',
      instagram_id: 'mybusiness_in',
      pan_number: 'ABCDE1234F',
      bank_details: 'HDFC Bank, A/C: 50100012345678, IFSC: HDFC0000123',
      invoice_prefix: 'INV',
      invoice_footer: 'Thank you for shopping with us!',
      gemini_api_key: ''
    }));
  }

  if (!localStorage.getItem('inbill_local_expense_categories')) {
    localStorage.setItem('inbill_local_expense_categories', JSON.stringify([
      { id: 1, name: 'Tea & Snacks', is_default: 1 },
      { id: 2, name: 'Transport & Fuel', is_default: 1 },
      { id: 3, name: 'Office Rent & Power', is_default: 1 },
      { id: 4, name: 'Salary & Wages', is_default: 1 },
      { id: 5, name: 'Miscellaneous', is_default: 1 }
    ]));
  }

  if (!localStorage.getItem('inbill_local_attribute_defs')) {
    localStorage.setItem('inbill_local_attribute_defs', JSON.stringify([
      { id: 1, name: 'IMEI / Serial No', type: 'text', required: 0 },
      { id: 2, name: 'Warranty (Months)', type: 'number', required: 0 }
    ]));
  }

  if (!localStorage.getItem('inbill_local_custom_categories')) {
    localStorage.setItem('inbill_local_custom_categories', JSON.stringify([
      { id: 1, name: 'Smartphones', sort_order: 1, is_active: 1 },
      { id: 2, name: 'Accessories', sort_order: 2, is_active: 1 },
      { id: 3, name: 'General Stock', sort_order: 3, is_active: 1 }
    ]));
  }

  // Seeding sample catalog items if empty
  if (!localStorage.getItem('inbill_local_products')) {
    localStorage.setItem('inbill_local_products', JSON.stringify([
      {
        id: 1,
        product_name: 'iPhone 15 Pro Max',
        brand: 'Apple',
        category: 'Smartphones',
        unit: 'pcs',
        mrp: 149999,
        selling_price: 139999,
        cost_price: 110000,
        barcode: '190198066544',
        gst_rate: 18,
        cgst: 9,
        sgst: 9,
        quantity: 15,
        batch_number: 'BATCH-2026',
        expiry_date: '',
        product_size: '256GB',
        is_deleted: 0,
        min_stock_alert: 3,
        custom_fields: JSON.stringify({ 'IMEI / Serial No': '35-209900-176148-1', 'Warranty (Months)': '12' }),
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        product_name: 'USB-C Charging Cable',
        brand: 'Generic',
        category: 'Accessories',
        unit: 'pcs',
        mrp: 1999,
        selling_price: 1499,
        cost_price: 600,
        barcode: '88887777123',
        gst_rate: 18,
        cgst: 9,
        sgst: 9,
        quantity: 50,
        batch_number: '',
        expiry_date: '',
        product_size: '2m',
        is_deleted: 0,
        min_stock_alert: 5,
        custom_fields: '{}',
        created_at: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem('inbill_local_parties')) {
    localStorage.setItem('inbill_local_parties', JSON.stringify([
      { id: 1, name: 'Walk-in Customer', phone: '9999999999', address: 'Local Store Area', gstin: '', type: 'Customer', opening_balance: 0, current_balance: 0, is_deleted: 0 },
      { id: 2, name: 'Aniket Sharma', phone: '9820098200', address: 'Bandra West, Mumbai', gstin: '', type: 'Customer', opening_balance: 0, current_balance: 15000, is_deleted: 0 },
      { id: 3, name: 'Prime Telecom Distributors', phone: '9123456789', address: 'Lamington Road, Mumbai', gstin: '27AABCDE1234F1Z5', type: 'Supplier', opening_balance: 0, current_balance: -45000, is_deleted: 0 }
    ]));
  }

  // Ensure arrays exist in localStorage
  const listKeys = [
    'inbill_local_sales',
    'inbill_local_sale_items',
    'inbill_local_purchases',
    'inbill_local_purchase_items',
    'inbill_local_party_transactions',
    'inbill_local_returns',
    'inbill_local_return_items',
    'inbill_local_purchase_returns',
    'inbill_local_purchase_return_items',
    'inbill_local_expenses'
  ];
  listKeys.forEach(k => {
    if (!localStorage.getItem(k)) {
      localStorage.setItem(k, '[]');
    }
  });

  // If transactions are empty but we seeded balances, seed initial matching ledger entries
  const localTxs = JSON.parse(localStorage.getItem('inbill_local_party_transactions'));
  if (localTxs.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('inbill_local_party_transactions', JSON.stringify([
      { id: 1, party_id: 2, type: 'Sale', reference_id: 101, total_amount: 15000, paid_amount: 0, due_amount: 15000, credit_days: 15, due_date: today, date: today },
      { id: 2, party_id: 3, type: 'Purchase', reference_id: 201, total_amount: 45000, paid_amount: 0, due_amount: 45000, date: today }
    ]));
    // Seed matching bills
    localStorage.setItem('inbill_local_sales', JSON.stringify([
      { id: 101, invoice_number: 'INV-001', date: today, customer_name: 'Aniket Sharma', customer_phone: '9820098200', subtotal: 12711.86, total_gst: 2288.14, misc_charges: 0, total_amount: 15000, total_discount: 0, payment_mode: 'Credit', paid_amount: 0, due_amount: 15000, credit_days: 15, due_date: today, tax_mode: 'inclusive', party_id: 2 }
    ]));
    localStorage.setItem('inbill_local_purchases', JSON.stringify([
      { id: 201, supplier_name: 'Prime Telecom Distributors', party_id: 3, total_amount: 45000, paid_amount: 0, due_amount: 45000, other_charges: 0, date: today }
    ]));
  }
};

// Generic Local Storage helpers
const getLocalList = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocalList = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const getLocalObject = (key) => JSON.parse(localStorage.getItem(key) || '{}');
const setLocalObject = (key, data) => localStorage.setItem(key, JSON.stringify(data));

export const dataLayer = {
  // --- AUTH / CONFIG ---
  async checkAuth() {
    if (typeof window === 'undefined') return { success: false };
    ensureLocalSeeds();

    if (isCloudActive()) {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const profile = await this.getSettings();
          return { success: true, mode: 'cloud', business: profile.profile };
        }
      } catch (e) {
        console.error('Cloud validation failed, falling back to local', e);
      }
    }
    const profile = getLocalObject('inbill_local_profile');
    return {
      success: true,
      mode: 'local',
      business: {
        name: profile.business_name || 'My Local App',
        short: profile.business_short || 'ML',
        currency: profile.currency_symbol || '₹'
      }
    };
  },

  async switchMode(cloudActive) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('inbill_cloud_active', cloudActive ? 'true' : 'false');
  },

  // --- DASHBOARD METRICS ---
  async getDashboard(from, to) {
    if (isCloudActive()) {
      const url = `/api/dashboard?from=${from || ''}&to=${to || ''}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    }

    // STANDALONE LOCAL CALCULATION
    const today = new Date().toISOString().slice(0, 10);
    const startDate = from || today;
    const endDate = to || today;

    const sales = getLocalList('inbill_local_sales').filter(s => s.date >= startDate && s.date <= endDate);
    const purchases = getLocalList('inbill_local_purchases').filter(p => p.date >= startDate && p.date <= endDate);
    const expenses = getLocalList('inbill_local_expenses').filter(e => e.date >= startDate && e.date <= endDate);
    const parties = getLocalList('inbill_local_parties').filter(p => !p.is_deleted);
    const products = getLocalList('inbill_local_products').filter(p => !p.is_deleted);

    let cashCollect = 0;
    let upiCollect = 0;
    let netSales = 0;
    let purchaseTotal = 0;
    let netProfit = 0;

    sales.forEach(s => {
      netSales += s.total_amount || 0;
      if (s.payment_mode === 'Cash') {
        cashCollect += s.paid_amount || 0;
      } else if (s.payment_mode === 'UPI') {
        upiCollect += s.paid_amount || 0;
      }
    });

    purchases.forEach(p => {
      purchaseTotal += p.total_amount || 0;
    });

    // Net Profit = (Total Sale Prices - Total Cost Prices of sold items) - expenses
    let costOfGoodsSold = 0;
    const saleItems = getLocalList('inbill_local_sale_items');
    sales.forEach(sale => {
      const items = saleItems.filter(si => si.sale_id === sale.id);
      items.forEach(item => {
        costOfGoodsSold += (item.cost_price || 0) * (item.quantity || 0);
      });
    });

    const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    netProfit = netSales - costOfGoodsSold - totalExpense;

    // Receivables and Payables
    let receivables = 0;
    let payables = 0;
    parties.forEach(p => {
      const bal = Number(p.current_balance || 0);
      if (bal > 0) receivables += bal;
      else if (bal < 0) payables += Math.abs(bal);
    });

    // Low stock items list
    const lowStockItems = products.filter(p => p.quantity <= (p.min_stock_alert || 0));

    // Combined recent transactions list (sorted by date desc)
    const logs = [];
    sales.forEach(s => logs.push({ id: `sale-${s.id}`, type: 'Sale', name: s.customer_name || 'Walk-in', amount: s.total_amount, date: s.date, mode: s.payment_mode }));
    purchases.forEach(p => logs.push({ id: `pur-${p.id}`, type: 'Purchase', name: p.supplier_name || 'Unknown Vendor', amount: p.total_amount, date: p.date, mode: 'Paid' }));
    expenses.forEach(e => logs.push({ id: `exp-${e.id}`, type: 'Expense', name: e.category, amount: e.amount, date: e.date, mode: 'Paid' }));
    
    // Sort transactions
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      stats: {
        cash_collections: cashCollect,
        digital_collections: upiCollect,
        net_sales: netSales,
        purchases: purchaseTotal,
        net_profit: netProfit,
        expenses: totalExpense
      },
      receivables,
      payables,
      lowStock: lowStockItems,
      transactions: logs.slice(0, 10)
    };
  },

  // --- PRODUCTS ---
  async getProducts() {
    if (isCloudActive()) {
      const res = await fetch('/api/inventory');
      if (res.ok) return await res.json();
    }
    return getLocalList('inbill_local_products').filter(p => !p.is_deleted);
  },

  async saveProduct(product) {
    if (isCloudActive()) {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      return await res.json();
    }

    const list = getLocalList('inbill_local_products');
    const gstRate = parseFloat(product.gst_rate) || 0;

    const data = {
      ...product,
      mrp: parseFloat(product.mrp) || 0,
      selling_price: parseFloat(product.selling_price) || 0,
      cost_price: parseFloat(product.cost_price) || 0,
      quantity: Number(product.quantity) || 0,
      min_stock_alert: Number(product.min_stock_alert) || 0,
      gst_rate: gstRate,
      cgst: gstRate / 2,
      sgst: gstRate / 2,
      is_deleted: 0
    };

    if (product.id) {
      const idx = list.findIndex(p => p.id === product.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
      }
    } else {
      data.id = list.length > 0 ? Math.max(...list.map(p => p.id)) + 1 : 1;
      data.created_at = new Date().toISOString();
      list.push(data);
    }

    setLocalList('inbill_local_products', list);
    return { success: true, product: data };
  },

  async deleteProduct(id) {
    if (isCloudActive()) {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      return await res.json();
    }

    const list = getLocalList('inbill_local_products');
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx].is_deleted = 1;
      setLocalList('inbill_local_products', list);
    }
    return { success: true };
  },

  // --- PARTIES ---
  async getParties(type) {
    if (isCloudActive()) {
      const res = await fetch(`/api/parties?type=${type || ''}`);
      if (res.ok) return await res.json();
    }
    const list = getLocalList('inbill_local_parties').filter(p => !p.is_deleted);
    if (type) return list.filter(p => p.type === type);
    return list;
  },

  async saveParty(party) {
    if (isCloudActive()) {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(party)
      });
      return await res.json();
    }

    const list = getLocalList('inbill_local_parties');
    const data = {
      ...party,
      opening_balance: parseFloat(party.opening_balance) || 0,
      current_balance: parseFloat(party.opening_balance) || 0,
      is_deleted: 0
    };

    if (party.id) {
      const idx = list.findIndex(p => p.id === party.id);
      if (idx !== -1) {
        // Keep current balance but update others
        data.current_balance = list[idx].current_balance;
        list[idx] = { ...list[idx], ...data };
      }
    } else {
      data.id = list.length > 0 ? Math.max(...list.map(p => p.id)) + 1 : 1;
      data.created_at = new Date().toISOString();
      list.push(data);
    }

    setLocalList('inbill_local_parties', list);
    return { success: true, party: data };
  },

  async deleteParty(id) {
    if (isCloudActive()) {
      const res = await fetch(`/api/parties?id=${id}`, { method: 'DELETE' });
      return await res.json();
    }

    const list = getLocalList('inbill_local_parties');
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx].is_deleted = 1;
      setLocalList('inbill_local_parties', list);
    }
    return { success: true };
  },

  // --- LEDGER & PAYMENTS ---
  async getPartyLedger(partyId) {
    if (isCloudActive()) {
      const res = await fetch(`/api/parties/ledger?party_id=${partyId}`);
      if (res.ok) return await res.json();
    }

    const parties = getLocalList('inbill_local_parties');
    const party = parties.find(p => p.id === Number(partyId));
    if (!party) return { error: 'Party not found' };

    const transactions = getLocalList('inbill_local_party_transactions')
      .filter(tx => tx.party_id === Number(partyId))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return { party, ledger: transactions };
  },

  async recordPayment({ party_id, amount, payment_mode = 'Cash', note = '', date }) {
    if (isCloudActive()) {
      const res = await fetch('/api/parties/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ party_id, amount, payment_mode, note, date })
      });
      return await res.json();
    }

    const paymentAmount = Number(amount || 0);
    const parties = getLocalList('inbill_local_parties');
    const partyIdx = parties.findIndex(p => p.id === Number(party_id));
    if (partyIdx === -1) return { error: 'Party not found' };

    const party = parties[partyIdx];
    
    // Validate outstanding
    if (party.type === 'Supplier') {
      const payable = Math.max(0, Math.abs(Number(party.current_balance || 0)));
      if (paymentAmount > payable + 0.1) {
        return { error: `Payment exceeds outstanding payable. Maximum allowed: ${payable}` };
      }
    } else {
      const receivable = Math.max(0, Number(party.current_balance || 0));
      if (paymentAmount > receivable + 0.1) {
        return { error: `Payment exceeds outstanding receivable. Maximum allowed: ${receivable}` };
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const txnDate = date || today;

    // 1. Insert Payment transaction
    const txs = getLocalList('inbill_local_party_transactions');
    const nextTxId = txs.length > 0 ? Math.max(...txs.map(t => t.id)) + 1 : 1;
    
    txs.push({
      id: nextTxId,
      party_id: Number(party_id),
      type: 'Payment',
      total_amount: paymentAmount,
      paid_amount: paymentAmount,
      due_amount: 0,
      payment_mode,
      note,
      date: txnDate
    });
    setLocalList('inbill_local_party_transactions', txs);

    // 2. Adjust party current balance
    const direction = party.type === 'Supplier' ? 1 : -1;
    party.current_balance += paymentAmount * direction;
    setLocalList('inbill_local_parties', parties);

    // 3. FIFO Debt Reconciliation
    let remaining = paymentAmount;
    const sales = getLocalList('inbill_local_sales');
    const purchases = getLocalList('inbill_local_purchases');

    // Get open invoices
    let openInvoices = [];
    if (party.type === 'Customer') {
      openInvoices = sales.filter(s => s.party_id === party.id && s.due_amount > 0.1);
    } else {
      openInvoices = purchases.filter(p => p.party_id === party.id && p.due_amount > 0.1);
    }

    // Sort by due date or normal date
    openInvoices.sort((a, b) => new Date(a.due_date || a.date) - new Date(b.due_date || b.date));

    for (const inv of openInvoices) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, Number(inv.due_amount || 0));
      
      inv.due_amount = Math.max(0, inv.due_amount - applied);

      // update invoice in matches lists
      if (party.type === 'Customer') {
        const invIdx = sales.findIndex(s => s.id === inv.id);
        if (invIdx !== -1) sales[invIdx] = inv;
      } else {
        const invIdx = purchases.findIndex(p => p.id === inv.id);
        if (invIdx !== -1) purchases[invIdx] = inv;
      }

      // update matching ledger item
      const ledgerTxIdx = txs.findIndex(t => t.party_id === party.id && t.reference_id === inv.id && t.type === (party.type === 'Customer' ? 'Sale' : 'Purchase'));
      if (ledgerTxIdx !== -1) {
        txs[ledgerTxIdx].due_amount = Math.max(0, txs[ledgerTxIdx].due_amount - applied);
      }

      remaining -= applied;
    }

    setLocalList('inbill_local_sales', sales);
    setLocalList('inbill_local_purchases', purchases);
    setLocalList('inbill_local_party_transactions', txs);

    return { success: true };
  },

  // --- BILLING / SALES ---
  async getSales(from, to) {
    if (isCloudActive()) {
      const res = await fetch(`/api/sales?from=${from || ''}&to=${to || ''}`);
      if (res.ok) return await res.json();
    }
    const sales = getLocalList('inbill_local_sales');
    if (from && to) {
      return sales.filter(s => s.date >= from && s.date <= (to + ' 23:59:59')).sort((a, b) => b.id - a.id);
    }
    return sales.sort((a, b) => b.id - a.id);
  },

  async createSale(saleData) {
    if (isCloudActive()) {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });
      return await res.json();
    }

    const {
      party_id,
      customer_name = '',
      customer_phone = '',
      customer_address = '',
      items = [],
      misc_charges = 0,
      payment_mode = 'Cash',
      tax_mode = 'exclusive',
      paid_amount: paidAmountInput,
      credit_days = 0,
      date
    } = saleData;

    if (!items || items.length === 0) return { error: 'Sale must have at least one item' };

    // 1. Generate local invoice number
    const profile = getLocalObject('inbill_local_profile');
    const prefix = profile.invoice_prefix || 'INV';
    const sales = getLocalList('inbill_local_sales');
    const nextNum = sales.length > 0 ? Math.max(...sales.map(s => {
      const match = s.invoice_number.match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    })) + 1 : 1;
    const invoiceNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`;

    // 2. Validate stock and calc totals
    let subtotal = 0;
    let totalGst = 0;
    const products = getLocalList('inbill_local_products');
    const processedItems = [];

    for (const item of items) {
      const itemQty = Number(item.quantity) || 0;
      const itemPrice = parseFloat(item.price) || 0;
      const gstRate = parseFloat(item.gst_rate) || 0;
      const mrp = parseFloat(item.mrp || item.price) || 0;

      if (itemQty <= 0) return { error: `Invalid quantity for ${item.product_name}` };

      // Deduct local product stock
      const pIdx = products.findIndex(p => p.id === item.product_id);
      let costPrice = 0;
      if (pIdx !== -1) {
        if (products[pIdx].quantity < itemQty) {
          return { error: `Insufficient stock for ${products[pIdx].product_name}. Available: ${products[pIdx].quantity}, requested: ${itemQty}` };
        }
        products[pIdx].quantity -= itemQty;
        costPrice = products[pIdx].cost_price || 0;
      }

      const itemLineTotal = itemPrice * itemQty;
      let gstAmount = 0;
      let basePrice = itemPrice;

      if (tax_mode === 'inclusive') {
        basePrice = itemPrice / (1 + (gstRate / 100));
        gstAmount = itemLineTotal - (basePrice * itemQty);
      } else {
        gstAmount = (itemLineTotal * gstRate) / 100;
      }

      const itemTotal = tax_mode === 'inclusive' ? itemLineTotal : itemLineTotal + gstAmount;
      const discount = mrp > itemPrice ? (mrp - itemPrice) * itemQty : 0;

      processedItems.push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: itemQty,
        mrp,
        price: basePrice,
        cost_price: costPrice,
        discount,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        total_price: itemTotal,
        returned_quantity: 0
      });

      subtotal += basePrice * itemQty;
      totalGst += gstAmount;
    }

    const totalDiscount = processedItems.reduce((s, i) => s + i.discount, 0);
    const parsedMisc = parseFloat(misc_charges) || 0;
    const totalAmount = Math.round(subtotal + totalGst + parsedMisc);
    const paid_amount = paidAmountInput !== undefined ? Number(paidAmountInput) : totalAmount;
    const dueAmount = Math.max(0, totalAmount - paid_amount);

    const crDays = dueAmount > 0 ? Math.max(0, Number(credit_days)) : 0;
    let dueDate = '';
    const todayStr = new Date().toISOString().slice(0, 10);
    const saleDate = date || todayStr;

    if (dueAmount > 0 && crDays > 0) {
      const promised = new Date();
      promised.setDate(promised.getDate() + crDays);
      dueDate = promised.toISOString().slice(0, 10);
    }

    // Save inventory deduction
    setLocalList('inbill_local_products', products);

    // Save Sale object
    const saleId = sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 101;
    const newSale = {
      id: saleId,
      invoice_number: invoiceNumber,
      date: saleDate,
      party_id: party_id || null,
      customer_name,
      customer_phone,
      customer_address,
      subtotal: Number(subtotal.toFixed(2)),
      total_gst: Number(totalGst.toFixed(2)),
      misc_charges: parsedMisc,
      total_amount: totalAmount,
      total_discount: totalDiscount,
      payment_mode,
      paid_amount,
      due_amount: dueAmount,
      credit_days: crDays,
      due_date: dueDate,
      tax_mode,
      returned_total: 0
    };
    sales.push(newSale);
    setLocalList('inbill_local_sales', sales);

    // Save Sale items list
    const saleItems = getLocalList('inbill_local_sale_items');
    processedItems.forEach((p, idx) => {
      p.id = saleItems.length > 0 ? Math.max(...saleItems.map(si => si.id)) + 1 + idx : 1 + idx;
      p.sale_id = saleId;
      saleItems.push(p);
    });
    setLocalList('inbill_local_sale_items', saleItems);

    // Update customer balance & ledger
    if (party_id) {
      const parties = getLocalList('inbill_local_parties');
      const partyIdx = parties.findIndex(p => p.id === party_id);
      if (partyIdx !== -1) {
        parties[partyIdx].current_balance += dueAmount;
        setLocalList('inbill_local_parties', parties);
      }

      const txs = getLocalList('inbill_local_party_transactions');
      txs.push({
        id: txs.length > 0 ? Math.max(...txs.map(t => t.id)) + 1 : 1,
        party_id,
        type: 'Sale',
        reference_id: saleId,
        total_amount: totalAmount,
        paid_amount,
        due_amount: dueAmount,
        credit_days: crDays,
        due_date: dueDate,
        date: saleDate
      });
      setLocalList('inbill_local_party_transactions', txs);
    }

    return { success: true, sale: newSale };
  },

  // --- STOCK-IN / PURCHASES ---
  async getPurchases(from, to) {
    if (isCloudActive()) {
      const res = await fetch('/api/purchases');
      if (res.ok) return await res.json();
    }
    const purchases = getLocalList('inbill_local_purchases');
    if (from && to) {
      return purchases.filter(p => p.date >= from && p.date <= (to + ' 23:59:59')).sort((a, b) => b.id - a.id);
    }
    return purchases.sort((a, b) => b.id - a.id);
  },

  async createPurchase(purchaseData) {
    if (isCloudActive()) {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData)
      });
      return await res.json();
    }

    const {
      party_id,
      supplier_name = '',
      items = [],
      other_charges = 0,
      paid_amount = 0,
      date
    } = purchaseData;

    if (!items || items.length === 0) return { error: 'Purchase must have at least one item' };

    let itemsTotal = 0;
    items.forEach(item => {
      itemsTotal += (parseFloat(item.price) || 0) * (Number(item.quantity) || 0);
    });

    const parsedOther = parseFloat(other_charges) || 0;
    const totalAmount = itemsTotal + parsedOther;
    const parsedPaid = parseFloat(paid_amount) || 0;
    const dueAmount = totalAmount - parsedPaid;

    const todayStr = new Date().toISOString().slice(0, 10);
    const purchaseDate = date || todayStr;

    // Save purchase row
    const purchases = getLocalList('inbill_local_purchases');
    const purchaseId = purchases.length > 0 ? Math.max(...purchases.map(p => p.id)) + 1 : 201;
    const newPur = {
      id: purchaseId,
      supplier_name,
      party_id: party_id || null,
      total_amount: totalAmount,
      paid_amount: parsedPaid,
      due_amount: dueAmount,
      other_charges: parsedOther,
      date: purchaseDate
    };
    purchases.push(newPur);
    setLocalList('inbill_local_purchases', purchases);

    // Update supplier balance and ledger
    if (party_id) {
      const parties = getLocalList('inbill_local_parties');
      const partyIdx = parties.findIndex(p => p.id === party_id);
      if (partyIdx !== -1) {
        // Supplier balance decreases
        parties[partyIdx].current_balance -= dueAmount;
        setLocalList('inbill_local_parties', parties);
      }

      const txs = getLocalList('inbill_local_party_transactions');
      txs.push({
        id: txs.length > 0 ? Math.max(...txs.map(t => t.id)) + 1 : 1,
        party_id,
        type: 'Purchase',
        reference_id: purchaseId,
        total_amount: totalAmount,
        paid_amount: parsedPaid,
        due_amount: dueAmount,
        date: purchaseDate
      });
      setLocalList('inbill_local_party_transactions', txs);
    }

    // Process items & update stock
    const products = getLocalList('inbill_local_products');
    const purchaseItems = getLocalList('inbill_local_purchase_items');

    items.forEach((item, idx) => {
      const trimmedName = (item.product_name || '').trim();
      if (!trimmedName) return;

      const purchasePrice = parseFloat(item.price) || 0;
      const itemQty = Number(item.quantity) || 0;
      const gstRate = parseFloat(item.gst_rate) || 0;
      const mrp = parseFloat(item.mrp || purchasePrice) || 0;
      const sellingPrice = parseFloat(item.selling_price || mrp) || purchasePrice * 1.2;

      // Find if exists
      const pIdx = products.findIndex(p => p.product_name.toLowerCase().replace(/\s/g, '') === trimmedName.toLowerCase().replace(/\s/g, ''));
      let targetId;

      if (pIdx !== -1) {
        // Resurrect & add stock
        targetId = products[pIdx].id;
        products[pIdx].quantity += itemQty;
        products[pIdx].batch_number = item.batch_number || '';
        products[pIdx].expiry_date = item.expiry_date || '';
        products[pIdx].cost_price = purchasePrice;
        products[pIdx].mrp = mrp;
        products[pIdx].selling_price = sellingPrice;
        products[pIdx].is_deleted = 0;
        
        let merged = {};
        try { merged = JSON.parse(products[pIdx].custom_fields || '{}'); } catch(e){}
        Object.assign(merged, item.custom_fields || {});
        products[pIdx].custom_fields = JSON.stringify(merged);
      } else {
        // Create new item
        targetId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push({
          id: targetId,
          product_name: trimmedName,
          brand: '',
          category: item.category || 'General Stock',
          product_size: item.product_size || '',
          unit: 'pcs',
          cost_price: purchasePrice,
          mrp,
          selling_price: sellingPrice,
          gst_rate: gstRate,
          cgst: gstRate / 2,
          sgst: gstRate / 2,
          quantity: itemQty,
          batch_number: item.batch_number || '',
          expiry_date: item.expiry_date || '',
          custom_fields: JSON.stringify(item.custom_fields || {}),
          is_deleted: 0,
          created_at: new Date().toISOString()
        });
      }

      // Link to purchase items list
      purchaseItems.push({
        id: purchaseItems.length > 0 ? Math.max(...purchaseItems.map(pi => pi.id)) + 1 + idx : 1 + idx,
        purchase_id: purchaseId,
        product_id: targetId,
        product_name: trimmedName,
        quantity: itemQty,
        price: purchasePrice,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || ''
      });
    });

    setLocalList('inbill_local_products', products);
    setLocalList('inbill_local_purchase_items', purchaseItems);

    return { success: true, purchaseId };
  },

  // --- RETURNS ---
  async getReturns(type = 'sale') {
    if (isCloudActive()) {
      const res = await fetch(`/api/returns?type=${type}`);
      if (res.ok) return await res.json();
    }

    if (type === 'sale') {
      const returns = getLocalList('inbill_local_returns').sort((a, b) => b.id - a.id);
      const items = getLocalList('inbill_local_return_items');
      returns.forEach(r => {
        r.items = items.filter(ri => ri.return_id === r.id);
      });
      return returns;
    } else {
      const returns = getLocalList('inbill_local_purchase_returns').sort((a, b) => b.id - a.id);
      const items = getLocalList('inbill_local_purchase_return_items');
      returns.forEach(r => {
        r.items = items.filter(ri => ri.purchase_return_id === r.id);
      });
      return returns;
    }
  },

  async createReturn(returnData) {
    if (isCloudActive()) {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      });
      return await res.json();
    }

    const {
      type = 'sale',
      sale_id,
      purchase_id,
      party_id,
      total_amount,
      payment_mode = 'Credit',
      reason = '',
      items = [],
      date
    } = returnData;

    const returnTotal = parseFloat(total_amount) || 0;
    if (returnTotal <= 0) return { error: 'Total return amount must be greater than zero' };
    if (!items || items.length === 0) return { error: 'Return must have at least one item' };

    const todayStr = new Date().toISOString().slice(0, 10);
    const returnDate = date || todayStr;

    if (type === 'sale') {
      // 1. Validate remaining returnable qty
      const saleItems = getLocalList('inbill_local_sale_items');
      const allReturns = getLocalList('inbill_local_returns');
      const allReturnItems = getLocalList('inbill_local_return_items');

      for (const item of items) {
        if (sale_id && item.product_id) {
          const sold = saleItems.find(si => si.sale_id === sale_id && si.product_id === item.product_id);
          const soldQty = sold?.quantity || 0;

          const alreadyReturned = allReturnItems.reduce((acc, ri) => {
            const parentReturn = allReturns.find(r => r.id === ri.return_id);
            if (parentReturn && parentReturn.sale_id === sale_id && ri.product_id === item.product_id) {
              return acc + (ri.quantity || 0);
            }
            return acc;
          }, 0);

          const remaining = soldQty - alreadyReturned;
          if (item.quantity > remaining) {
            return { error: `Cannot return ${item.quantity} of ${item.product_name}. Only ${remaining} remaining.` };
          }
        }
      }

      // 2. Smart split
      let debtCleared = 0;
      let refundAmount = 0;
      const sales = getLocalList('inbill_local_sales');
      
      if (sale_id) {
        const saleIdx = sales.findIndex(s => s.id === sale_id);
        if (saleIdx !== -1) {
          debtCleared = Math.min(returnTotal, sales[saleIdx].due_amount || 0);
          refundAmount = returnTotal - debtCleared;
        }
      } else {
        refundAmount = returnTotal;
      }

      // 3. Save Return Row
      const returns = getLocalList('inbill_local_returns');
      const returnId = returns.length > 0 ? Math.max(...returns.map(r => r.id)) + 1 : 1;
      const newRet = {
        id: returnId,
        sale_id: sale_id || null,
        party_id: party_id || null,
        total_amount: returnTotal,
        debt_cleared_amount: debtCleared,
        refund_amount: refundAmount,
        payment_mode,
        reason,
        date: returnDate
      };
      returns.push(newRet);
      setLocalList('inbill_local_returns', returns);

      // 4. Save items & add product stock
      const products = getLocalList('inbill_local_products');
      const returnItems = getLocalList('inbill_local_return_items');

      items.forEach((item, idx) => {
        let pName = item.product_name;
        const pIdx = products.findIndex(p => p.id === item.product_id);
        if (pIdx !== -1) {
          pName = products[pIdx].product_name;
          products[pIdx].quantity += item.quantity;
        }

        returnItems.push({
          id: returnItems.length > 0 ? Math.max(...returnItems.map(ri => ri.id)) + 1 + idx : 1 + idx,
          return_id: returnId,
          product_id: item.product_id,
          product_name: pName || 'Unknown Product',
          quantity: item.quantity,
          price: item.price,
          total_price: item.quantity * item.price
        });
      });

      setLocalList('inbill_local_products', products);
      setLocalList('inbill_local_return_items', returnItems);

      // 5. Update party balance & ledger
      if (party_id) {
        const parties = getLocalList('inbill_local_parties');
        const partyIdx = parties.findIndex(p => p.id === party_id);
        if (partyIdx !== -1) {
          if (debtCleared > 0) {
            parties[partyIdx].current_balance -= debtCleared;
          }
          if (refundAmount > 0 && payment_mode === 'Credit') {
            parties[partyIdx].current_balance -= refundAmount;
          }
          setLocalList('inbill_local_parties', parties);
        }

        const txs = getLocalList('inbill_local_party_transactions');
        if (debtCleared > 0) {
          txs.push({
            id: txs.length > 0 ? Math.max(...txs.map(t => t.id)) + 1 : 1,
            party_id,
            type: 'Sales Return',
            reference_id: returnId,
            total_amount: debtCleared,
            note: `Debt Cleared for Sale ID: ${sale_id || 'N/A'}`,
            date: returnDate
          });
        }
        if (refundAmount > 0 && payment_mode === 'Credit') {
          txs.push({
            id: txs.length > 0 ? Math.max(...txs.map(t => t.id)) + 1 : 1,
            party_id,
            type: 'Sales Return',
            reference_id: returnId,
            total_amount: refundAmount,
            note: `Store Credit from Return ID: ${returnId}`,
            date: returnDate
          });
        }
        setLocalList('inbill_local_party_transactions', txs);
      }

      // 6. Update Original Sale Record
      if (sale_id) {
        const saleIdx = sales.findIndex(s => s.id === sale_id);
        if (saleIdx !== -1) {
          sales[saleIdx].due_amount = Math.max(0, sales[saleIdx].due_amount - debtCleared);
          sales[saleIdx].returned_total = (sales[saleIdx].returned_total || 0) + returnTotal;
          setLocalList('inbill_local_sales', sales);
        }

        const txs = getLocalList('inbill_local_party_transactions');
        const ledgerTxIdx = txs.findIndex(t => t.party_id === party_id && t.reference_id === sale_id && t.type === 'Sale');
        if (ledgerTxIdx !== -1) {
          txs[ledgerTxIdx].due_amount = Math.max(0, txs[ledgerTxIdx].due_amount - debtCleared);
          setLocalList('inbill_local_party_transactions', txs);
        }

        items.forEach(item => {
          const sItemIdx = saleItems.findIndex(si => si.sale_id === sale_id && si.product_id === item.product_id);
          if (sItemIdx !== -1) {
            saleItems[sItemIdx].returned_quantity = (saleItems[sItemIdx].returned_quantity || 0) + item.quantity;
          }
        });
        setLocalList('inbill_local_sale_items', saleItems);
      }

      return { success: true, returnId };
    } else {
      // --- PURCHASE RETURN LOGIC ---
      let debtCleared = 0;
      let refundAmount = 0;
      const purchases = getLocalList('inbill_local_purchases');

      if (purchase_id) {
        const purIdx = purchases.findIndex(p => p.id === purchase_id);
        if (purIdx !== -1) {
          debtCleared = Math.min(returnTotal, purchases[purIdx].due_amount || 0);
          refundAmount = returnTotal - debtCleared;
        }
      } else {
        refundAmount = returnTotal;
      }

      // 1. Save Return Row
      const pReturns = getLocalList('inbill_local_purchase_returns');
      const pReturnId = pReturns.length > 0 ? Math.max(...pReturns.map(pr => pr.id)) + 1 : 1;
      const newPRet = {
        id: pReturnId,
        purchase_id: purchase_id || null,
        party_id: party_id || null,
        total_amount: returnTotal,
        debt_cleared_amount: debtCleared,
        refund_amount: refundAmount,
        payment_mode,
        reason,
        date: returnDate
      };
      pReturns.push(newPRet);
      setLocalList('inbill_local_purchase_returns', pReturns);

      // 2. Save items & decrease product stock
      const products = getLocalList('inbill_local_products');
      const pReturnItems = getLocalList('inbill_local_purchase_return_items');

      items.forEach((item, idx) => {
        let pName = item.product_name;
        const pIdx = products.findIndex(p => p.id === item.product_id);
        if (pIdx !== -1) {
          pName = products[pIdx].product_name;
          products[pIdx].quantity = Math.max(0, products[pIdx].quantity - item.quantity);
        }

        pReturnItems.push({
          id: pReturnItems.length > 0 ? Math.max(...pReturnItems.map(pri => pri.id)) + 1 + idx : 1 + idx,
          purchase_return_id: pReturnId,
          product_id: item.product_id,
          product_name: pName || 'Unknown Product',
          quantity: item.quantity,
          price: item.price,
          total_price: item.quantity * item.price
        });
      });

      setLocalList('inbill_local_products', products);
      setLocalList('inbill_local_purchase_return_items', pReturnItems);

      // 3. Update party balance & ledger
      if (party_id) {
        const parties = getLocalList('inbill_local_parties');
        const partyIdx = parties.findIndex(p => p.id === party_id);
        if (partyIdx !== -1) {
          if (debtCleared > 0) {
            parties[partyIdx].current_balance += debtCleared;
          }
          if (refundAmount > 0 && payment_mode === 'Credit') {
            parties[partyIdx].current_balance += refundAmount;
          }
          setLocalList('inbill_local_parties', parties);
        }

        const txs = getLocalList('inbill_local_party_transactions');
        if (debtCleared > 0) {
          txs.push({
            id: txs.length > 0 ? Math.max(...txs.map(t => t.id)) + 1 : 1,
            party_id,
            type: 'Purchase Return',
            reference_id: pReturnId,
            total_amount: debtCleared,
            note: `Debt Cleared for Purchase ID: ${purchase_id || 'N/A'}`,
            date: returnDate
          });
        }
        if (refundAmount > 0 && payment_mode === 'Credit') {
          txs.push({
            id: txs.length > 0 ? Math.max(...txs.map(t => t.id)) + 1 : 1,
            party_id,
            type: 'Purchase Return',
            reference_id: pReturnId,
            total_amount: refundAmount,
            note: `Supplier Credit from Return ID: ${pReturnId}`,
            date: returnDate
          });
        }
        setLocalList('inbill_local_party_transactions', txs);
      }

      // 4. Update Original Purchase Record
      if (purchase_id) {
        const purIdx = purchases.findIndex(p => p.id === purchase_id);
        if (purIdx !== -1) {
          purchases[purIdx].due_amount = Math.max(0, purchases[purIdx].due_amount - debtCleared);
          setLocalList('inbill_local_purchases', purchases);
        }

        const txs = getLocalList('inbill_local_party_transactions');
        const ledgerTxIdx = txs.findIndex(t => t.party_id === party_id && t.reference_id === purchase_id && t.type === 'Purchase');
        if (ledgerTxIdx !== -1) {
          txs[ledgerTxIdx].due_amount = Math.max(0, txs[ledgerTxIdx].due_amount - debtCleared);
          setLocalList('inbill_local_party_transactions', txs);
        }
      }

      return { success: true, pReturnId };
    }
  },

  async deleteReturn(id, type = 'sale') {
    if (isCloudActive()) {
      const res = await fetch(`/api/returns?id=${id}&type=${type}`, { method: 'DELETE' });
      return await res.json();
    }

    if (type === 'sale') {
      const returns = getLocalList('inbill_local_returns');
      const retIdx = returns.findIndex(r => r.id === id);
      if (retIdx === -1) return { error: 'Return not found' };

      const ret = returns[retIdx];
      const returnItems = getLocalList('inbill_local_return_items').filter(ri => ri.return_id === id);

      // Reverse stock
      const products = getLocalList('inbill_local_products');
      returnItems.forEach(item => {
        const pIdx = products.findIndex(p => p.id === item.product_id);
        if (pIdx !== -1) {
          products[pIdx].quantity = Math.max(0, products[pIdx].quantity - item.quantity);
        }
      });
      setLocalList('inbill_local_products', products);

      // Reverse Smart Reconciliation
      if (ret.party_id) {
        const parties = getLocalList('inbill_local_parties');
        const partyIdx = parties.findIndex(p => p.id === ret.party_id);
        const totalCreditImpact = Number(ret.debt_cleared_amount || 0) + (ret.payment_mode === 'Credit' ? Number(ret.refund_amount || 0) : 0);
        
        if (partyIdx !== -1 && totalCreditImpact > 0) {
          parties[partyIdx].current_balance += totalCreditImpact;
          setLocalList('inbill_local_parties', parties);
        }

        const txs = getLocalList('inbill_local_party_transactions');
        const cleanTxs = txs.filter(t => !(t.type === 'Sales Return' && t.reference_id === id));
        setLocalList('inbill_local_party_transactions', cleanTxs);
      }

      // Reverse Original Sale due & quantities
      if (ret.sale_id) {
        const sales = getLocalList('inbill_local_sales');
        const saleIdx = sales.findIndex(s => s.id === ret.sale_id);
        if (saleIdx !== -1) {
          sales[saleIdx].due_amount += Number(ret.debt_cleared_amount || 0);
          sales[saleIdx].returned_total = Math.max(0, (sales[saleIdx].returned_total || 0) - ret.total_amount);
          setLocalList('inbill_local_sales', sales);
        }

        const txs = getLocalList('inbill_local_party_transactions');
        const ledgerTxIdx = txs.findIndex(t => t.party_id === ret.party_id && t.reference_id === ret.sale_id && t.type === 'Sale');
        if (ledgerTxIdx !== -1) {
          txs[ledgerTxIdx].due_amount += Number(ret.debt_cleared_amount || 0);
          setLocalList('inbill_local_party_transactions', txs);
        }

        const saleItems = getLocalList('inbill_local_sale_items');
        returnItems.forEach(item => {
          const sItemIdx = saleItems.findIndex(si => si.sale_id === ret.sale_id && si.product_id === item.product_id);
          if (sItemIdx !== -1) {
            saleItems[sItemIdx].returned_quantity = Math.max(0, (saleItems[sItemIdx].returned_quantity || 0) - item.quantity);
          }
        });
        setLocalList('inbill_local_sale_items', saleItems);
      }

      // Delete return record
      const cleanReturns = returns.filter(r => r.id !== id);
      setLocalList('inbill_local_returns', cleanReturns);
      const cleanRetItems = getLocalList('inbill_local_return_items').filter(ri => ri.return_id !== id);
      setLocalList('inbill_local_return_items', cleanRetItems);

      return { success: true };
    } else {
      const pReturns = getLocalList('inbill_local_purchase_returns');
      const retIdx = pReturns.findIndex(pr => pr.id === id);
      if (retIdx === -1) return { error: 'Return not found' };

      const ret = pReturns[retIdx];
      const pReturnItems = getLocalList('inbill_local_purchase_return_items').filter(pri => pri.purchase_return_id === id);

      // Reverse stock
      const products = getLocalList('inbill_local_products');
      pReturnItems.forEach(item => {
        const pIdx = products.findIndex(p => p.id === item.product_id);
        if (pIdx !== -1) {
          products[pIdx].quantity += item.quantity;
        }
      });
      setLocalList('inbill_local_products', products);

      // Reverse Smart Reconciliation
      if (ret.party_id) {
        const parties = getLocalList('inbill_local_parties');
        const partyIdx = parties.findIndex(p => p.id === ret.party_id);
        const totalCreditImpact = Number(ret.debt_cleared_amount || 0) + (ret.payment_mode === 'Credit' ? Number(ret.refund_amount || 0) : 0);

        if (partyIdx !== -1 && totalCreditImpact > 0) {
          parties[partyIdx].current_balance -= totalCreditImpact;
          setLocalList('inbill_local_parties', parties);
        }

        const txs = getLocalList('inbill_local_party_transactions');
        const cleanTxs = txs.filter(t => !(t.type === 'Purchase Return' && t.reference_id === id));
        setLocalList('inbill_local_party_transactions', cleanTxs);
      }

      // Reverse Original Purchase due
      if (ret.purchase_id) {
        const purchases = getLocalList('inbill_local_purchases');
        const purIdx = purchases.findIndex(p => p.id === ret.purchase_id);
        if (purIdx !== -1) {
          purchases[purIdx].due_amount += ret.total_amount;
          setLocalList('inbill_local_purchases', purchases);
        }

        const txs = getLocalList('inbill_local_party_transactions');
        const ledgerTxIdx = txs.findIndex(t => t.party_id === ret.party_id && t.reference_id === ret.purchase_id && t.type === 'Purchase');
        if (ledgerTxIdx !== -1) {
          txs[ledgerTxIdx].due_amount += ret.total_amount;
          setLocalList('inbill_local_party_transactions', txs);
        }
      }

      // Delete return record
      const cleanReturns = pReturns.filter(pr => pr.id !== id);
      setLocalList('inbill_local_purchase_returns', cleanReturns);
      const cleanRetItems = getLocalList('inbill_local_purchase_return_items').filter(pri => pri.purchase_return_id !== id);
      setLocalList('inbill_local_purchase_return_items', cleanRetItems);

      return { success: true };
    }
  },

  // --- EXPENSES ---
  async getExpenses(from, to) {
    if (isCloudActive()) {
      const res = await fetch(`/api/expenses?from=${from || ''}&to=${to || ''}`);
      if (res.ok) return await res.json();
    }

    const expenses = getLocalList('inbill_local_expenses');
    const categories = getLocalList('inbill_local_expense_categories');

    let filtered = expenses;
    if (from && to) {
      filtered = expenses.filter(e => e.date >= from && e.date <= (to + ' 23:59:59'));
    }
    return {
      expenses: filtered.sort((a, b) => new Date(b.date) - new Date(a.date)),
      categories: categories.sort((a, b) => b.is_default - a.is_default)
    };
  },

  async saveExpense(expenseData) {
    if (isCloudActive()) {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });
      return await res.json();
    }

    const list = getLocalList('inbill_local_expenses');
    const todayStr = new Date().toISOString().slice(0, 10);

    const data = {
      id: list.length > 0 ? Math.max(...list.map(e => e.id)) + 1 : 1,
      category: expenseData.category,
      description: expenseData.description || '',
      amount: parseFloat(expenseData.amount) || 0,
      date: expenseData.date || todayStr
    };

    list.push(data);
    setLocalList('inbill_local_expenses', list);
    return { success: true, expense: data };
  },

  async saveExpenseCategory(name) {
    if (isCloudActive()) {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_category', category_name: name })
      });
      return await res.json();
    }

    const cats = getLocalList('inbill_local_expense_categories');
    const trimmed = name.trim();
    if (cats.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return { error: 'Category already exists' };
    }

    const nextId = cats.length > 0 ? Math.max(...cats.map(c => c.id)) + 1 : 1;
    const newCat = { id: nextId, name: trimmed, is_default: 0 };
    cats.push(newCat);
    setLocalList('inbill_local_expense_categories', cats);
    return { success: true, category: newCat };
  },

  async deleteExpense(id) {
    if (isCloudActive()) {
      const res = await fetch(`/api/expenses?id=${id}&type=expense`, { method: 'DELETE' });
      return await res.json();
    }

    const list = getLocalList('inbill_local_expenses');
    const clean = list.filter(e => e.id !== id);
    setLocalList('inbill_local_expenses', clean);
    return { success: true };
  },

  async deleteExpenseCategory(id) {
    if (isCloudActive()) {
      const res = await fetch(`/api/expenses?id=${id}&type=category`, { method: 'DELETE' });
      return await res.json();
    }

    const list = getLocalList('inbill_local_expense_categories');
    const item = list.find(c => c.id === id);
    if (item?.is_default === 1) return { error: 'Cannot delete default category' };

    const clean = list.filter(c => c.id !== id);
    setLocalList('inbill_local_expense_categories', clean);
    return { success: true };
  },

  // --- SETTINGS & PROFILE ---
  async getSettings() {
    if (isCloudActive()) {
      const res = await fetch('/api/settings');
      if (res.ok) return await res.json();
    }

    const profile = getLocalObject('inbill_local_profile');
    const attributeDefs = getLocalList('inbill_local_attribute_defs');
    const customCategories = getLocalList('inbill_local_custom_categories');

    return { profile, attributeDefs, customCategories };
  },

  async saveSettings(action, data) {
    if (isCloudActive()) {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });
      return await res.json();
    }

    if (action === 'update_profile') {
      setLocalObject('inbill_local_profile', data.profileData);
      return { success: true, message: 'Local profile updated successfully' };
    } else if (action === 'save_attribute_def') {
      const defs = getLocalList('inbill_local_attribute_defs');
      const item = data.attributeDef;
      
      if (item.id) {
        const idx = defs.findIndex(d => d.id === item.id);
        if (idx !== -1) defs[idx] = item;
      } else {
        item.id = defs.length > 0 ? Math.max(...defs.map(d => d.id)) + 1 : 1;
        defs.push(item);
      }
      setLocalList('inbill_local_attribute_defs', defs);
      return { success: true, message: 'Custom attribute saved locally' };
    } else if (action === 'delete_attribute_def') {
      const defs = getLocalList('inbill_local_attribute_defs');
      const clean = defs.filter(d => d.id !== data.deleteDefId);
      setLocalList('inbill_local_attribute_defs', clean);
      return { success: true, message: 'Custom attribute deleted' };
    } else if (action === 'save_category') {
      const cats = getLocalList('inbill_local_custom_categories');
      const item = data.categoryData;

      if (item.id) {
        const idx = cats.findIndex(c => c.id === item.id);
        if (idx !== -1) cats[idx] = item;
      } else {
        item.id = cats.length > 0 ? Math.max(...cats.map(c => c.id)) + 1 : 1;
        item.is_active = 1;
        cats.push(item);
      }
      setLocalList('inbill_local_custom_categories', cats);
      return { success: true, message: 'Product category saved locally' };
    } else if (action === 'delete_category') {
      const cats = getLocalList('inbill_local_custom_categories');
      const clean = cats.filter(c => c.id !== data.deleteCatId);
      setLocalList('inbill_local_custom_categories', clean);
      return { success: true, message: 'Product category deleted' };
    }

    return { error: 'Action unsupported' };
  },

  // --- GEMINI SERVICES ---
  async getInsights(snapshot, geminiApiKey) {
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot, geminiApiKey })
    });
    return await res.json();
  },

  async parseInvoice(base64, mimeType, geminiApiKey) {
    const res = await fetch('/api/ai-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType, geminiApiKey })
    });
    return await res.json();
  }
};
