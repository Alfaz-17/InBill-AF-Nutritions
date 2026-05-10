const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { initDB, seedDB, productOps, saleOps, purchaseOps, returnOps, statsOps, reportOps, expenseOps, partyOps } = require('./db');

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
    title: 'Supplement Store Manager',
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
      Extract structured inventory data from this invoice image.
      Return ONLY a JSON object with the following structure:
      {
        "vendor": "Supplier Name",
        "invoice_number": "Bill ID",
        "date": "YYYY-MM-DD",
        "invoice_total": 0.00,
        "other_charges": 0.00,
        "items": [
          {
            "description": "Product Name",
            "quantity": 1,
            "price": 0.00,
            "amount": 0.00,
            "batch_number": "BN123",
            "expiry_date": "YYYY-MM-DD",
            "hsn_code": "optional",
            "gst_rate": 18
          }
        ]
      }
      Extract "other_charges" for shipping, freight, delivery, or round-off fees.
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
      quantity: parseFloat(item.quantity) || 1,
      price: parseFloat(item.price) || 0,
      amount: parseFloat(item.amount) || (parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0),
      batch_number: item.batch_number || "",
      expiry_date: item.expiry_date || "",
      hsn_code: item.hsn_code || "",
      gst_rate: parseFloat(item.gst_rate) || 0,
    }));

    return {
      success: true,
      vendor: parsedData.vendor || "",
      invoice_number: parsedData.invoice_number || "",
      date: parsedData.date || "",
      invoice_total: parseFloat(parsedData.invoice_total) || lineItems.reduce((s, i) => s + i.amount, 0),
      other_charges: parseFloat(parsedData.other_charges) || 0,
      items: lineItems,
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

ipcMain.handle('settings:seedData', () => {
  try {
    seedDB();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
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

ipcMain.handle('pdf:share', async (_, base64Data) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const tempPath = path.join(app.getPath('temp'), `AF_Nutrition_Invoice_${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, buffer);

    // Use file.io for anonymous sharing
    // Since we don't have form-data installed, we can use a simpler approach or Electron's net
    const { net } = require('electron');
    return new Promise((resolve) => {
      const boundary = 'AF Nutrition' + Date.now();
      const postData = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="invoice.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
        buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);

      const request = net.request({
        method: 'POST',
        url: 'https://file.io/?expires=1d',
      });

      request.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
      request.setHeader('Content-Length', postData.length.toString());

      request.on('response', (response) => {
        let body = '';
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
          if (response.statusCode >= 400) {
            resolve({ success: false, error: `Upload Failed (${response.statusCode})` });
            return;
          }
          try {
            const result = JSON.parse(body);
            if (result.success) resolve({ success: true, link: result.link });
            else resolve({ success: false, error: result.message || 'Upload failed' });
          } catch (e) {
            resolve({ success: false, error: 'Malformed cloud response' });
          }
        });
      });

      request.on('error', (err) => resolve({ success: false, error: err.message }));
      request.end(postData);
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});
