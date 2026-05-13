const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { initDB, resetDB, productOps, saleOps, purchaseOps, returnOps, purchaseReturnOps, statsOps, reportOps, expenseOps, partyOps, businessProfileOps, categoryOps, expenseCategoryOps, attributeOps, storageOps } = require('./db');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'InBill — Professional Billing',
    backgroundColor: '#0f172a',
    show: false,
  });

  const startUrl = isDev
    ? 'http://localhost:3456'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(startUrl);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(() => {
  initDB();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ───────── Product IPC ───────── */
ipcMain.handle('products:getAll', () => productOps.getAll());
ipcMain.handle('products:getById', (_, id) => productOps.getById(id));
ipcMain.handle('products:search', (_, term) => productOps.search(term));
ipcMain.handle('products:add', (_, product) => productOps.add(product));
ipcMain.handle('products:update', (_, id, product) => productOps.update(id, product));
ipcMain.handle('products:delete', (_, id) => productOps.delete(id));
ipcMain.handle('products:lowStock', (_, threshold) => productOps.getLowStock(threshold));
ipcMain.handle('products:expiring', (_, days) => productOps.getExpiring(days));
ipcMain.handle('products:getLastPrice', (_, name) => productOps.getLastPurchasePrice(name));

/* ───────── Sales IPC ───────── */
ipcMain.handle('sales:create', async (_, saleData) => {
  try { return saleOps.create(saleData); }
  catch (e) { console.error('Sales Error:', e); throw e; }
});
ipcMain.handle('sales:getAll', () => saleOps.getAll());
ipcMain.handle('sales:getById', (_, id) => saleOps.getById(id));
ipcMain.handle('sales:getByInvoice', (_, inv) => saleOps.getByInvoice(inv));
ipcMain.handle('sales:getByDateRange', (_, from, to) => saleOps.getByDateRange(from, to));
ipcMain.handle('sales:getToday', () => saleOps.getTodaySales());

/* ───────── Purchase IPC ───────── */
ipcMain.handle('purchases:create', async (_, data) => {
  try { return purchaseOps.create(data); }
  catch (e) { console.error('Purchase Error:', e); throw e; }
});
ipcMain.handle('purchases:getAll', () => purchaseOps.getAll());
ipcMain.handle('purchases:getById', (_, id) => purchaseOps.getById(id));

/* ───────── Returns IPC ───────── */
ipcMain.handle('returns:create', (_, data) => returnOps.create(data));
ipcMain.handle('returns:getAll', () => returnOps.getAll());

/* ───────── Purchase Returns IPC ───────── */
ipcMain.handle('purchaseReturns:create', (_, data) => purchaseReturnOps.create(data));
ipcMain.handle('purchaseReturns:getAll', () => purchaseReturnOps.getAll());
ipcMain.handle('purchaseReturns:getById', (_, id) => purchaseReturnOps.getById(id));

/* ───────── Expenses IPC ───────── */
ipcMain.handle('expenses:getAll', () => expenseOps.getAll());
ipcMain.handle('expenses:add', (_, data) => expenseOps.add(data));
ipcMain.handle('expenses:delete', (_, id) => expenseOps.delete(id));

/* ───────── Dashboard IPC ───────── */
ipcMain.handle('stats:dashboard', () => statsOps.getDashboard());
ipcMain.handle('stats:getMonthly', () => statsOps.getMonthlyStats());

/* ───────── Reports IPC ───────── */
ipcMain.handle('reports:sales', (_, from, to) => reportOps.salesReport(from, to));
ipcMain.handle('reports:purchases', (_, from, to) => reportOps.purchaseReport(from, to));
ipcMain.handle('reports:stock', () => reportOps.stockReport());

/* ───────── Party IPC ───────── */
ipcMain.handle('parties:getAll', (_, type) => partyOps.getAll(type));
ipcMain.handle('parties:getById', (_, id) => partyOps.getById(id));
ipcMain.handle('parties:add', (_, data) => partyOps.add(data));
ipcMain.handle('parties:update', (_, id, data) => partyOps.update(id, data));
ipcMain.handle('parties:delete', (_, id) => partyOps.delete(id));
ipcMain.handle('parties:updateBalance', (_, id, amount) => partyOps.updateBalance(id, amount));

/* ───────── Business Profile IPC ───────── */
ipcMain.handle('business:getProfile', () => businessProfileOps.get());
ipcMain.handle('business:updateProfile', (_, data) => businessProfileOps.update(data));
ipcMain.handle('business:pickLogo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

/* ───────── Categories IPC ───────── */
ipcMain.handle('categories:getAll', () => categoryOps.getAll());
ipcMain.handle('categories:add', (_, name) => categoryOps.add(name));
ipcMain.handle('categories:delete', (_, id) => categoryOps.delete(id));

/* ───────── Product Attributes (Dynamic Fields) IPC ───────── */
ipcMain.handle('attributes:getAll', () => attributeOps.getAll());
ipcMain.handle('attributes:add', (_, attr) => attributeOps.add(attr));
ipcMain.handle('attributes:delete', (_, id) => attributeOps.delete(id));

/* ───────── Expense Categories IPC ───────── */
ipcMain.handle('expenseCategories:getAll', () => expenseCategoryOps.getAll());
ipcMain.handle('expenseCategories:add', (_, name) => expenseCategoryOps.add(name));
ipcMain.handle('expenseCategories:delete', (_, id) => expenseCategoryOps.delete(id));

/* ───────── AI Invoice Upload IPC ───────── */
ipcMain.handle('ai:selectFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Invoices (Images & PDFs)', extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  
  let mimeType = 'image/jpeg';
  if (ext === 'pdf') mimeType = 'application/pdf';
  else if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'webp') mimeType = 'image/webp';
  else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
  
  return { base64, mimeType, fileName: path.basename(filePath) };
});

ipcMain.handle('ai:parseInvoice', async (_, { base64, mimeType }) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return { success: false, error: "GEMINI_API_KEY not configured." };

    const ai = new GoogleGenAI({ apiKey });
    const modelName = "gemini-2.5-flash";

    const prompt = `
      You are an expert invoice parser. Extract EVERY piece of structured data from this invoice image.
      
      CRITICAL RULES:
      1. Extract ALL items with their standard fields (name, qty, price, etc.)
      2. DETECT INDUSTRY-SPECIFIC FIELDS: Look for ANY columns, labels, or data that go beyond standard invoice fields.
         Examples of custom fields to detect:
         - Serial numbers, IMEI numbers, Motor Numbers, Controller Numbers, Chassis Numbers
         - Warranty periods, Model numbers, Part numbers, OEM codes
         - Color, Size, Weight, Material, Grade, Purity, Carat
         - Batch codes, Lot numbers, Manufacturing dates
         - Any identifier, specification, or tracking number unique to the product
      3. Put ALL such detected fields into the "custom_fields" object with descriptive key names.
      4. DETECT CATEGORIES: Classify each product into a sensible business category based on its description.
         Examples: "EV Bikes", "Spare Parts", "Electronics", "Medicines", "Groceries", etc.
      5. Extract product_size from weight/volume/variant info (e.g. "500g", "1L", "XL", "128GB").
      
      Return ONLY a JSON object with this structure:
      {
        "vendor": "Supplier Name",
        "invoice_number": "Bill ID",
        "date": "YYYY-MM-DD",
        "invoice_total": 0.00,
        "other_charges": 0.00,
        "items": [
          {
            "description": "Product Name",
            "category": "Detected Category (e.g. EV Bikes, Spare Parts, Electronics)",
            "product_size": "Weight/Size/Variant if applicable",
            "quantity": 1,
            "price": 0.00,
            "amount": 0.00,
            "batch_number": "BN123",
            "expiry_date": "YYYY-MM-DD",
            "hsn_code": "optional",
            "gst_rate": 18,
            "cgst_rate": 9,
            "sgst_rate": 9,
            "custom_fields": {
              "Motor Number": "MTR-12345",
              "Controller Number": "CTRL-6789",
              "IMEI": "35-209900-176148-1",
              "Serial Number": "SN-001",
              "Warranty (Months)": "24",
              "Color": "Red",
              "Model": "X100"
            }
          }
        ],
        "detected_new_fields": ["Motor Number", "Controller Number"]
      }
      
      IMPORTANT: 
      - The "custom_fields" object should capture ALL non-standard data visible in the invoice.
      - "detected_new_fields" should list the names of ALL custom field keys you extracted.
      - If a column in the invoice has serial numbers, part numbers, or any unique identifiers per item, those MUST go into custom_fields.
      - Extract "other_charges" for shipping, freight, delivery, or round-off fees.
      - Try to categorize products based on their description into industry-relevant categories.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        { inlineData: { data: base64, mimeType: mimeType || "image/jpeg" } },
        { text: prompt },
      ],
      config: { responseMimeType: "application/json" },
    });

    const resultText = response.text || "{}";
    const parsedData = JSON.parse(resultText);

    const lineItems = (parsedData.items || []).map((item, idx) => ({
      description: item.description || `Item ${idx + 1}`,
      category: item.category || "",
      product_size: item.product_size || "",
      quantity: parseFloat(item.quantity) || 1,
      price: parseFloat(item.price) || 0,
      amount: parseFloat(item.amount) || (parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0),
      batch_number: item.batch_number || "",
      expiry_date: item.expiry_date || "",
      hsn_code: item.hsn_code || "",
      gst_rate: parseFloat(item.gst_rate) || 0,
      cgst: parseFloat(item.cgst_rate) || (parseFloat(item.gst_rate) || 0) / 2,
      sgst: parseFloat(item.sgst_rate) || (parseFloat(item.gst_rate) || 0) / 2,
      custom_fields: item.custom_fields || {},
    }));

    // Collect all unique custom field names and categories detected
    const detectedFields = new Set(parsedData.detected_new_fields || []);
    const detectedCategories = new Set();
    lineItems.forEach(item => {
      if (item.category) detectedCategories.add(item.category);
      Object.keys(item.custom_fields).forEach(k => detectedFields.add(k));
    });

    return {
      success: true,
      vendor: parsedData.vendor || "",
      invoice_number: parsedData.invoice_number || "",
      date: parsedData.date || "",
      invoice_total: parseFloat(parsedData.invoice_total) || lineItems.reduce((s, i) => s + i.amount, 0),
      other_charges: parseFloat(parsedData.other_charges) || 0,
      items: lineItems,
      detected_new_fields: [...detectedFields],
      detected_categories: [...detectedCategories],
    };
  } catch (err) {
    console.error("AI Parse error:", err);
    return { success: false, error: err.message };
  }
});

/* ── Gemini API Key Management ── */
function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || '';
}

/* ── Settings IPC ── */
ipcMain.handle('settings:getGeminiKey', () => {
  const key = getGeminiApiKey();
  if (!key) return { configured: false, maskedKey: '' };
  const masked = key.substring(0, 6) + '•'.repeat(Math.max(0, key.length - 10)) + key.substring(key.length - 4);
  return { configured: true, maskedKey: masked };
});

ipcMain.handle('settings:setGeminiKey', (_, newKey) => {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    let lines = [];
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      lines = content.split('\n').filter(l => !l.trim().startsWith('GEMINI_API_KEY='));
    }
    lines.push(`GEMINI_API_KEY=${newKey.trim()}`);
    fs.writeFileSync(envPath, lines.filter(l => l.trim()).join('\n') + '\n');
    process.env.GEMINI_API_KEY = newKey.trim();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('settings:resetData', () => {
  try {
    resetDB();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('storage:export', async () => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Business Data',
    defaultPath: `InBill_Backup_${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  
  if (filePath) {
    const data = storageOps.exportAll();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('storage:import', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Import Business Data',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths[0]) {
    const content = fs.readFileSync(filePaths[0], 'utf8');
    const data = JSON.parse(content);
    storageOps.importAll(data);
    return { success: true };
  }
  return { success: false };
});

/* ───────── PDF Generation & Sharing IPC ───────── */
ipcMain.handle('pdf:generate', async (_, html) => {
  let pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false
    }
  });

  try {
    // We use a data URL to load the HTML content directly
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 500));

    const options = {
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      pageSize: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      color: true
    };

    const data = await pdfWindow.webContents.printToPDF(options);
    const tempPath = path.join(app.getPath('temp'), `invoice_${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, data);
    
    return { success: true, filePath: tempPath, buffer: data.toString('base64') };
  } catch (err) {
    console.error('PDF Gen Error:', err);
    return { success: false, error: err.message };
  } finally {
    if (pdfWindow) pdfWindow.destroy();
  }
});

ipcMain.handle('pdf:saveAs', async (_, base64Data, fileName) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: fileName || 'invoice.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (filePath) {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  }
  return { success: false };
});

/* ───────── Native Printing IPC ───────── */
ipcMain.handle('ai:printInvoice', async (_, html) => {
  let printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false
    }
  });

  try {
    // Load HTML content
    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    printWindow.webContents.on('did-finish-load', () => {
      // Small extra buffer for heavy images/gradients
      setTimeout(() => {
        printWindow.webContents.print({
          silent: false,
          printBackground: true,
          margins: { marginType: 'default' },
          pageSize: 'A4'
        }, (success, errorType) => {
          if (!success && errorType !== 'cancelled') {
            console.error('Print Error:', errorType);
          }
          printWindow.destroy();
        });
      }, 300);
    });

    return { success: true };
  } catch (err) {
    console.error('Print Handler Error:', err);
    if (printWindow) printWindow.destroy();
    return { success: false, error: err.message };
  }
});

