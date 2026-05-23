const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const { pathToFileURL } = require('url');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;
const { db, initDB, resetDB, productOps, saleOps, purchaseOps, statsOps, reportOps, expenseOps, partyOps, returnOps, businessProfileOps, categoryOps, expenseCategoryOps, attributeOps, storageOps, syncToCloud, mobileAccessOps, authOps } = require('./db');

const OFFLINE_MESSAGE = 'You are offline. InBill is still working with local data; cloud sync, AI and WhatsApp will resume when internet is back.';

function isLikelyNetworkError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return (
    code.includes('econn') ||
    code.includes('enotfound') ||
    code.includes('etimedout') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('internet') ||
    message.includes('offline') ||
    message.includes('timeout') ||
    message.includes('getaddrinfo') ||
    message.includes('connection')
  );
}

function userFriendlyExternalError(error) {
  return isLikelyNetworkError(error) ? OFFLINE_MESSAGE : (error?.message || 'Something went wrong. Please try again.');
}

// Disable GPU acceleration to prevent "Access Denied" errors on synced drives like OneDrive
app.disableHardwareAcceleration();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    icon: path.join(__dirname, '../build/inbill.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'InBill — Professional Billing',
    backgroundColor: '#0f172a',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3456');
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, load index.html via the app:// protocol
    mainWindow.loadURL('app://-/index.html');
  }

  if (isDev) {
    mainWindow.show();
  } else {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, bypassCSP: true, allowServiceWorkers: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  { scheme: 'local-file', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

app.whenReady().then(() => {
  // Production File Protocol Handler
  if (!isDev) {
    protocol.handle('app', async (request) => {
      try {
        const url = new URL(request.url);
        let pathname = url.pathname;
        if (pathname.startsWith('/')) pathname = pathname.substring(1);
        
        // Normalize pathname for Windows and trailingSlash support
        if (pathname === '' || pathname === '/') pathname = 'index.html';
        
        let filePath = path.join(__dirname, '../out', pathname);
        
        // Fallback logic for Next.js Static Export
        if (!fs.existsSync(filePath)) {
          // 1. Try appending .html (Next.js default for some routes)
          if (fs.existsSync(filePath + '.html')) {
            filePath += '.html';
          } 
          // 2. Try index.html in the folder (trailingSlash: true)
          else if (fs.existsSync(path.join(filePath, 'index.html'))) {
            filePath = path.join(filePath, 'index.html');
          }
          // 3. SPA Fallback: If it's not a static asset (no extension), serve root index.html
          else if (!pathname.includes('.')) {
            filePath = path.join(__dirname, '../out', 'index.html');
          }
        }

        if (!fs.existsSync(filePath)) {
          return new Response('Not Found', { status: 404 });
        }

        // Determine Mime Type
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.webp': 'image/webp',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const data = fs.readFileSync(filePath);
        
        return new Response(data, {
          status: 200,
          headers: { 'Content-Type': contentType }
        });
      } catch (err) {
        console.error('Protocol Handler Error:', err);
        return new Response('Internal Server Error', { status: 500 });
      }
    });
  }
  // Register local-file protocol to handle local asset loading
  // Register local-file protocol to handle local asset loading with standard URL structure
  protocol.handle('local-file', async (request) => {
    try {
      const url = new URL(request.url);
      const filePath = url.searchParams.get('path');
      
      if (!filePath) {
        return new Response('Missing path', { status: 400 });
      }

      // Handle both absolute and potentially relative paths
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

      if (!fs.existsSync(absolutePath)) {
        console.warn('⚠️ local-file not found:', absolutePath);
        return new Response('File not found', { status: 404 });
      }

      // Use pathToFileURL for net.fetch to handle special characters in paths correctly
      return net.fetch(pathToFileURL(absolutePath).toString());
    } catch (e) {
      console.error('Protocol Error:', e);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  initDB();
  createWindow();

  // Set up background auto-sync/auto-pull polling timer every 30 seconds
  setInterval(async () => {
    try {
      const config = db.prepare('SELECT use_cloud FROM business_profile WHERE id = 1').get();
      if (config?.use_cloud) {
        console.log("⏰ Background Auto-Pull: Syncing with Neon Postgres...");
        const result = await syncToCloud();
        if (result && result.success && mainWindow) {
          mainWindow.webContents.send('db:auto-pulled');
        }
      }
    } catch (e) {
      console.error("Background sync failed:", e.message);
    }
  }, 30000); // 30 seconds

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
ipcMain.handle('purchases:delete', (_, id) => purchaseOps.delete(id));

/* ───────── Updates IPC ───────── */
ipcMain.handle('app:checkUpdate', async () => {
  try {
    // You can replace this with your actual GitHub or website version.json URL
    const UPDATE_URL = 'https://raw.githubusercontent.com/alfaz/inbill/main/version.json';
    const response = await net.fetch(UPDATE_URL);
    if (!response.ok) return { success: false };
    const data = await response.json();
    return { 
      success: true, 
      latestVersion: data.version,
      currentVersion: app.getVersion(),
      updateUrl: data.downloadUrl || 'https://inbill.store/download'
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/* ───────── Expenses IPC ───────── */
ipcMain.handle('expenses:getAll', () => expenseOps.getAll());
ipcMain.handle('expenses:add', (_, data) => expenseOps.add(data));
ipcMain.handle('expenses:delete', (_, id) => expenseOps.delete(id));

/* ───────── Dashboard IPC ───────── */
ipcMain.handle('stats:dashboard', () => statsOps.getDashboard());
ipcMain.handle('stats:getMonthly', () => statsOps.getMonthlyStats());
ipcMain.handle('stats:getAiSnapshot', () => statsOps.getAiSnapshot());

/* ───────── Reports IPC ───────── */
ipcMain.handle('reports:sales', (_, from, to) => reportOps.salesReport(from, to));
ipcMain.handle('reports:purchases', (_, from, to) => reportOps.purchaseReport(from, to));
ipcMain.handle('reports:stock', () => reportOps.stockReport());

/* ───────── Returns IPC ───────── */
ipcMain.handle('returns:createSaleReturn', (_, data) => returnOps.createSaleReturn(data));
ipcMain.handle('returns:getAllSaleReturns', () => returnOps.getAllSaleReturns());
ipcMain.handle('returns:deleteSaleReturn', (_, id) => returnOps.deleteSaleReturn(id));
ipcMain.handle('returns:createPurchaseReturn', (_, data) => returnOps.createPurchaseReturn(data));
ipcMain.handle('returns:getAllPurchaseReturns', () => returnOps.getAllPurchaseReturns());
ipcMain.handle('returns:deletePurchaseReturn', (_, id) => returnOps.deletePurchaseReturn(id));

/* ───────── Party IPC ───────── */
ipcMain.handle('parties:getAll', (_, type) => partyOps.getAll(type));
ipcMain.handle('parties:getById', (_, id) => partyOps.getById(id));
ipcMain.handle('parties:add', (_, data) => partyOps.add(data));
ipcMain.handle('parties:update', (_, id, data) => partyOps.update(id, data));
ipcMain.handle('parties:delete', (_, id) => partyOps.delete(id));
ipcMain.handle('parties:updateBalance', (_, id, amount) => partyOps.updateBalance(id, amount));
ipcMain.handle('parties:getLedger', (_, id) => partyOps.getLedger(id));
ipcMain.handle('parties:recordPayment', (_, data) => partyOps.recordPayment(data));

/* ───────── Authentication IPC ───────── */
ipcMain.handle('auth:check', () => {
  const password = authOps.getPassword();
  return { hasPassword: !!password };
});
ipcMain.handle('auth:verify', (_, password) => {
  return authOps.verify(password);
});
ipcMain.handle('auth:setPassword', (_, password) => {
  try {
    authOps.setPassword(password);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/* ───────── Business Profile IPC ───────── */

ipcMain.handle('business:getProfile', () => businessProfileOps.get());
ipcMain.handle('business:updateProfile', (_, data) => businessProfileOps.update(data));
ipcMain.handle('business:pickLogo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
  });
  
  if (result.canceled || result.filePaths.length === 0) return null;
  
  const sourcePath = result.filePaths[0];
  const stats = fs.statSync(sourcePath);
  
  // 5MB Limit Check
  if (stats.size > 5 * 1024 * 1024) {
    dialog.showErrorBox('File Too Large', 'Please select a logo smaller than 5MB.');
    return null;
  }

  try {
    const assetsDir = path.join(app.getPath('userData'), 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
    
    const ext = path.extname(sourcePath);
    const destName = `logo_${Date.now()}${ext}`;
    const destPath = path.join(assetsDir, destName);
    
    fs.copyFileSync(sourcePath, destPath);
    return destPath;
  } catch (err) {
    console.error('Logo Copy Error:', err);
    dialog.showErrorBox('Upload Error', 'Failed to save the logo. Please try again.');
    return null;
  }
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
    return { success: false, isOffline: isLikelyNetworkError(err), error: userFriendlyExternalError(err) };
  }
});

ipcMain.handle('ai:getInsights', async (_, snapshot) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return { success: false, error: "GEMINI_API_KEY not configured." };

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      You are a world-class Business Intelligence Consultant for a small retail/trading business.
      Analyze this business snapshot and provide 4-5 "SMART INSIGHTS" that are punchy, actionable, and helpful.
      
      Business Snapshot:
      ${JSON.stringify(snapshot, null, 2)}
      
      RULES:
      1. Be concise. One sentence per insight.
      2. Identify trends (e.g., profit up/down, fast movers, stock risks, payment delays).
      3. Use a professional yet encouraging tone.
      4. Avoid jargon. Use plain business English.
      5. Look for "hidden" patterns (e.g. if one category is 80% of revenue, mention it).
      
      Return ONLY a JSON array of strings:
      ["Insight 1", "Insight 2", "Insight 3", "Insight 4"]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
      config: { responseMimeType: "application/json" },
    });

    const resultText = response.text || "[]";
    return { success: true, insights: JSON.parse(resultText) };
  } catch (err) {
    console.error("AI Insights error:", err);
    return { success: false, isOffline: isLikelyNetworkError(err), error: userFriendlyExternalError(err) };
  }
});

/* ── Helper: Get API Key from DB ── */
function getGeminiApiKey() {
  const row = db.prepare('SELECT gemini_api_key FROM business_profile WHERE id = 1').get();
  return row?.gemini_api_key || '';
}

/* ── Settings IPC ── */
ipcMain.handle('settings:getGeminiKey', () => {
  const row = db.prepare('SELECT gemini_api_key FROM business_profile WHERE id = 1').get();
  const key = row?.gemini_api_key || '';
  if (!key) return { configured: false, maskedKey: '' };
  const masked = key.substring(0, 6) + '•'.repeat(Math.max(0, key.length - 10)) + key.substring(key.length - 4);
  return { configured: true, maskedKey: masked };
});

ipcMain.handle('settings:setGeminiKey', (_, newKey) => {
  try {
    db.prepare('UPDATE business_profile SET gemini_api_key = ? WHERE id = 1').run(newKey.trim());
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/* ── Neon Cloud Configuration ── */
ipcMain.handle('settings:getNeonConfig', () => {
  const row = db.prepare('SELECT neon_db_url, use_cloud FROM business_profile WHERE id = 1').get();
  return {
    url: row?.neon_db_url || '',
    useCloud: row?.use_cloud === 1
  };
});

ipcMain.handle('settings:setNeonConfig', async (_, { url, useCloud }) => {
  try {
    // Clean URL: Remove 'psql', quotes, and leading/trailing spaces
    let cleanUrl = (url || '').trim();
    if (cleanUrl.startsWith('psql ')) {
      cleanUrl = cleanUrl.replace(/^psql\s+['"]?|['"]?$/g, '');
    } else {
      cleanUrl = cleanUrl.replace(/^['"]|['"]$/g, '');
    }
    cleanUrl = cleanUrl.split('?')[0];
    
    db.prepare('UPDATE business_profile SET neon_db_url = ?, use_cloud = ? WHERE id = 1').run(cleanUrl, useCloud ? 1 : 0);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('settings:syncToCloud', async () => {
  try {
    return await syncToCloud();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/* ── Mobile Access Configuration ── */
ipcMain.handle('mobile:getConfig', () => mobileAccessOps.get());
ipcMain.handle('mobile:generate', async () => {
  const config = mobileAccessOps.generate();
  try {
    await syncToCloud();
  } catch (e) {
    console.error('Mobile generate: Background sync to cloud failed:', e.message);
  }
  return config;
});
ipcMain.handle('mobile:revoke', async () => {
  const result = mobileAccessOps.revoke();
  try {
    await syncToCloud();
  } catch (e) {
    console.error('Mobile revoke: Background sync to cloud failed:', e.message);
  }
  return result;
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
  try {
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
  } catch (err) {
    console.error('Export Error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('storage:import', async () => {
  try {
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
  } catch (err) {
    console.error('Import Error:', err);
    return { success: false, error: err.message };
  }
});

/* ── Helper: Resolve local-file protocol in HTML for PDF/Print ── */
async function resolveLocalImages(html) {
  // Regex to match local-file URLs and capture the path parameter
  // It looks for path= followed by anything up to a quote, space, or &
  const pattern = /local-file:\/\/[\?&]path=([^"'\s&]+)/g;
  const matches = [...html.matchAll(pattern)];
  let resolvedHtml = html;
  
  for (const match of matches) {
    try {
      const fullProtocolUrl = match[0];
      const encodedPath = match[1];
      const filePath = decodeURIComponent(encodedPath);
      
      if (filePath && fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        let mime = 'image/png';
        if (['jpg', 'jpeg'].includes(ext)) mime = 'image/jpeg';
        else if (ext === 'webp') mime = 'image/webp';
        else if (ext === 'svg') mime = 'image/svg+xml';
        
        const base64 = buffer.toString('base64');
        const dataUri = `data:${mime};base64,${base64}`;
        // Important: Replace ONLY the specific URL found
        resolvedHtml = resolvedHtml.split(fullProtocolUrl).join(dataUri);
      }
    } catch (e) {
      console.error('❌ Image Resolve Error:', e);
    }
  }
  return resolvedHtml;
}

/* ───────── PDF Generation & Sharing IPC ───────── */
ipcMain.handle('pdf:generate', async (_, html) => {
  let pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false
    }
  });

  let tempHtmlPath = null;
  try {
    let finalHtml = html;
    try {
      finalHtml = await resolveLocalImages(html);
    } catch (resolveErr) {
      console.error('⚠️ resolveLocalImages failed, using original HTML:', resolveErr);
    }

    // Use a temporary file instead of data: URL to avoid length limits (crucial for large Base64 logos)
    tempHtmlPath = path.join(app.getPath('temp'), `print_${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, finalHtml, 'utf8');
    
    await pdfWindow.loadURL(pathToFileURL(tempHtmlPath).toString());
    
    // Wait for content to render (Base64 images take a moment)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const options = {
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      pageSize: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      color: true
    };

    const data = await pdfWindow.webContents.printToPDF(options);
    const tempPdfPath = path.join(app.getPath('temp'), `invoice_${Date.now()}.pdf`);
    fs.writeFileSync(tempPdfPath, data);
    
    return { success: true, filePath: tempPdfPath, buffer: data.toString('base64') };
  } catch (err) {
    console.error('❌ PDF Gen Error:', err);
    return { success: false, error: err.message };
  } finally {
    if (pdfWindow) pdfWindow.destroy();
    if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
      try { fs.unlinkSync(tempHtmlPath); } catch (e) {}
    }
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

ipcMain.handle('pdf:saveDirect', async (_, base64Data, fileName) => {
  try {
    const documentsPath = app.getPath('documents');
    const targetDir = path.join(documentsPath, 'InBill_Invoices');
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, fileName || `Invoice_${Date.now()}.pdf`);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    // 🔥 MAGIC PASTE: Copy the actual file to clipboard using PowerShell
    const { exec } = require('child_process');
    // Using -LiteralPath to handle all characters correctly
    const psCommand = `powershell -Command "Set-Clipboard -LiteralPath \\"${filePath}\\""`;
    exec(psCommand, (error) => {
      if (error) {
        console.error('❌ Magic Paste failed:', error);
      } else {
        console.log('✅ MAGIC PASTE READY:', filePath);
      }
    });

    // Also reveal it just in case Magic Paste is blocked by security
    shell.showItemInFolder(filePath);
    
    return { success: true, filePath };
  } catch (err) {
    console.error('Direct Save Error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('pdf:share', async () => {
  return { success: false, error: 'Native PDF sharing is not available on this platform.' };
});

/* ───────── Native Printing IPC ───────── */
ipcMain.handle('ai:printInvoice', async (_, html) => {
  let printWindow = new BrowserWindow({
    show: false, // Hide the auxiliary window
    webPreferences: {
      nodeIntegration: false
    }
  });

  let tempHtmlPath = null;
  try {
    let finalHtml = html;
    try {
      finalHtml = await resolveLocalImages(html);
    } catch (resolveErr) {
      console.error('⚠️ resolveLocalImages failed for print, using original HTML:', resolveErr);
    }

    tempHtmlPath = path.join(app.getPath('temp'), `print_job_${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, finalHtml, 'utf8');
    
    await printWindow.loadURL(pathToFileURL(tempHtmlPath).toString());
    
    printWindow.webContents.on('did-finish-load', () => {
      // Small delay to ensure images are rendered before dialog pops up
      setTimeout(() => {
        printWindow.webContents.print({
          silent: false, // Show system dialog for preview and settings
          printBackground: true,
          margins: { marginType: 'default' },
          pageSize: 'A4'
        }, (success, errorType) => {
          if (success || errorType === 'cancelled') {
            printWindow.close();
          }
          // Clean up temp file
          if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
            try { fs.unlinkSync(tempHtmlPath); } catch (e) {}
          }
        });
      }, 800);
    });

    return { success: true };
  } catch (err) {
    console.error('Print Handler Error:', err);
    if (printWindow) printWindow.destroy();
    return { success: false, error: err.message };
  }
});

/* ───────── WhatsApp Integration IPC ───────── */
ipcMain.handle('whatsapp:sendInvoice', async (_, { phone, pdfBuffer, fileName, message }) => {
  try {
    const profile = businessProfileOps.get();
    let settings = {};
    try {
      settings = typeof profile.whatsapp_settings === 'string' 
        ? JSON.parse(profile.whatsapp_settings || '{}') 
        : (profile.whatsapp_settings || {});
    } catch(e) { settings = {}; }

    if (!settings.enabled || !settings.access_token || !settings.phone_number_id) {
      return { success: false, error: 'WhatsApp API is not configured.' };
    }

    let cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    // 1. Upload Media
    const uploadUrl = `https://graph.facebook.com/v21.0/${settings.phone_number_id}/media`;
    
    // Create FormData for media upload
    // Since net.fetch in Electron might not support direct FormData easily with buffers, 
    // we use a multipart body.
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const pdfData = Buffer.from(pdfBuffer, 'base64');
    
    const parts = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="messaging_product"',
      '',
      'whatsapp',
      `--${boundary}`,
      'Content-Disposition: form-data; name="type"',
      '',
      'application/pdf',
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName || 'invoice.pdf'}"`,
      'Content-Type: application/pdf',
      '',
      pdfData,
      `--${boundary}--`,
      ''
    ];

    // Combine parts into a single buffer
    const bodyBuffer = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p + '\r\n') : p));

    const uploadResponse = await net.fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: bodyBuffer
    });

    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok) {
      return { success: false, error: `Media upload failed: ${uploadData.error?.message || 'Unknown error'}` };
    }

    const mediaId = uploadData.id;

    // 2. Send Message
    const msgUrl = `https://graph.facebook.com/v21.0/${settings.phone_number_id}/messages`;
    const msgResponse = await net.fetch(msgUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'document',
        document: {
          id: mediaId,
          filename: fileName || 'Invoice.pdf',
          caption: message || 'Your invoice from ' + (profile.business_name || 'InBill')
        }
      })
    });

    const msgData = await msgResponse.json();
    if (msgResponse.ok) {
      return { success: true, data: msgData };
    } else {
      return { success: false, error: `Message failed: ${msgData.error?.message || 'Unknown error'}` };
    }
  } catch (err) {
    console.error('WhatsApp Invoice Error:', err);
    return { success: false, isOffline: isLikelyNetworkError(err), error: userFriendlyExternalError(err) };
  }
});

ipcMain.handle('whatsapp:sendMessage', async (_, { phone, message }) => {
  try {
    const profile = businessProfileOps.get();
    let settings = {};
    try {
      settings = typeof profile.whatsapp_settings === 'string' 
        ? JSON.parse(profile.whatsapp_settings || '{}') 
        : (profile.whatsapp_settings || {});
    } catch(e) { settings = {}; }

    if (!settings.enabled || !settings.access_token || !settings.phone_number_id) {
      return { success: false, error: 'WhatsApp API is not configured or enabled.' };
    }

    // Clean phone number (remove +, spaces, etc.)
    let cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone) return { success: false, error: 'Invalid phone number' };
    
    // If it's a 10-digit number (common in India), prepend 91
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const url = `https://graph.facebook.com/v21.0/${settings.phone_number_id}/messages`;
    
    const response = await net.fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: message }
      })
    });

    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    } else {
      console.error('WhatsApp API Error:', data);
      return { success: false, error: data.error?.message || 'Failed to send message' };
    }
  } catch (err) {
    console.error('WhatsApp Handler Error:', err);
    return { success: false, isOffline: isLikelyNetworkError(err), error: userFriendlyExternalError(err) };
  }
});
