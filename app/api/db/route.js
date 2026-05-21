import { NextResponse } from 'next/server';
import path from 'path';

// Force database path to point to store.db in root workspace before loading main/db
process.env.INBILL_DB_PATH = process.env.INBILL_DB_PATH || path.join(process.cwd(), 'store.db');

const { 
  db,
  initDB,
  resetDB,
  productOps, 
  saleOps, 
  purchaseOps, 
  statsOps, 
  reportOps, 
  expenseOps, 
  partyOps, 
  returnOps, 
  businessProfileOps, 
  categoryOps, 
  expenseCategoryOps, 
  attributeOps, 
  storageOps, 
  syncToCloud, 
  authOps,
  mobileAccessOps
} = require('../../../main/db.js');

// Load Gemini SDK
const { GoogleGenAI } = require('@google/genai');

// Ensure DB is initialized
try {
  initDB();
} catch (e) {
  console.error("DB Initialization error in API route:", e);
}

// Helper: Get API Key from DB
function getGeminiApiKey() {
  const row = businessProfileOps.get();
  return row?.gemini_api_key || '';
}

// AI Parse Invoice Handler
async function handleParseInvoice({ base64, mimeType }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { success: false, error: "GEMINI_API_KEY not configured." };

  const ai = new GoogleGenAI({ apiKey });
  
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
            "Motor Number": "MTR-12345"
          }
        }
      ],
      "detected_new_fields": ["Motor Number", "Warranty Period"]
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          data: base64,
          mimeType: mimeType
        }
      },
      { text: prompt }
    ],
    config: { responseMimeType: "application/json" }
  });

  const parsedData = JSON.parse(response.text || "{}");
  
  const lineItems = (parsedData.items || []).map(item => ({
    product_name: item.description || item.product_name || "Unknown Product",
    category: item.category || "General",
    product_size: item.product_size || "",
    quantity: parseFloat(item.quantity) || 1,
    selling_price: parseFloat(item.price) || 0,
    cost_price: parseFloat(item.price) || 0,
    amount: parseFloat(item.amount) || 0,
    batch_number: item.batch_number || "",
    expiry_date: item.expiry_date || "",
    hsn_code: item.hsn_code || "",
    gst_rate: parseFloat(item.gst_rate) || 0,
    custom_fields: item.custom_fields || {},
  }));

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
}

// AI Insights Handler
async function handleGetInsights(snapshot) {
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
}

export async function POST(req) {
  try {
    const { channel, args = [] } = await req.json();
    
    // Extract dynamic web-client browser credentials
    const neonUrlHeader = req.headers.get('x-neon-url');
    const geminiKeyHeader = req.headers.get('x-gemini-key');
    
    if (neonUrlHeader) {
      const currentProfile = db.prepare('SELECT neon_db_url, use_cloud FROM business_profile WHERE id = 1').get();
      if (!currentProfile) {
        db.prepare('INSERT INTO business_profile (id, neon_db_url, use_cloud) VALUES (1, ?, 1)').run(neonUrlHeader);
        console.log("🔄 Seeded first business profile with custom Neon URL.");
        try { await syncToCloud(); } catch (e) { console.error("Auto-sync error on seed:", e); }
      } else if (currentProfile.neon_db_url !== neonUrlHeader || currentProfile.use_cloud !== 1) {
        db.prepare('UPDATE business_profile SET neon_db_url = ?, use_cloud = 1 WHERE id = 1').run(neonUrlHeader);
        console.log("🔄 Dynamically updated session Neon Postgres connection URL.");
        try { await syncToCloud(); } catch (e) { console.error("Auto-sync error on update:", e); }
      }
    }

    if (geminiKeyHeader) {
      const currentProfile = db.prepare('SELECT gemini_api_key FROM business_profile WHERE id = 1').get();
      if (!currentProfile) {
        db.prepare('INSERT INTO business_profile (id, gemini_api_key) VALUES (1, ?)').run(geminiKeyHeader);
        console.log("🔄 Seeded first business profile with custom Gemini key.");
      } else if (currentProfile.gemini_api_key !== geminiKeyHeader) {
        db.prepare('UPDATE business_profile SET gemini_api_key = ? WHERE id = 1').run(geminiKeyHeader);
        console.log("🔄 Dynamically updated session Gemini API key.");
      }
    }
    
    let result;
    switch (channel) {
      /* ── Products ── */
      case 'products:getAll':
        result = productOps.getAll();
        break;
      case 'products:getById':
        result = productOps.getById(...args);
        break;
      case 'products:search':
        result = productOps.search(...args);
        break;
      case 'products:add':
        result = productOps.add(...args);
        break;
      case 'products:update':
        result = productOps.update(...args);
        break;
      case 'products:delete':
        result = productOps.delete(...args);
        break;
      case 'products:lowStock':
        result = productOps.getLowStock(...args);
        break;
      case 'products:expiring':
        result = productOps.getExpiring(...args);
        break;
      case 'products:getLastPrice':
        result = productOps.getLastPurchasePrice(...args);
        break;

      /* ── Sales ── */
      case 'sales:create':
        result = await saleOps.create(...args);
        break;
      case 'sales:getAll':
        result = saleOps.getAll();
        break;
      case 'sales:getById':
        result = saleOps.getById(...args);
        break;
      case 'sales:getByInvoice':
        result = saleOps.getByInvoice(...args);
        break;
      case 'sales:getByDateRange':
        result = saleOps.getByDateRange(...args);
        break;
      case 'sales:getToday':
        result = saleOps.getTodaySales();
        break;

      /* ── Purchases ── */
      case 'purchases:create':
        result = await purchaseOps.create(...args);
        break;
      case 'purchases:getAll':
        result = purchaseOps.getAll();
        break;
      case 'purchases:getById':
        result = purchaseOps.getById(...args);
        break;
      case 'purchases:delete':
        result = purchaseOps.delete(...args);
        break;

      /* ── Expenses ── */
      case 'expenses:getAll':
        result = expenseOps.getAll();
        break;
      case 'expenses:add':
        result = expenseOps.add(...args);
        break;
      case 'expenses:delete':
        result = expenseOps.delete(...args);
        break;

      /* ── Dashboard ── */
      case 'stats:dashboard':
        result = statsOps.getDashboard();
        break;
      case 'stats:getMonthly':
        result = statsOps.getMonthlyStats();
        break;
      case 'stats:getAiSnapshot':
        result = statsOps.getAiSnapshot();
        break;

      /* ── Reports ── */
      case 'reports:sales':
        result = reportOps.salesReport(...args);
        break;
      case 'reports:purchases':
        result = reportOps.purchaseReport(...args);
        break;
      case 'reports:stock':
        result = reportOps.stockReport();
        break;

      /* ── Returns ── */
      case 'returns:createSaleReturn':
        result = returnOps.createSaleReturn(...args);
        break;
      case 'returns:getAllSaleReturns':
        result = returnOps.getAllSaleReturns();
        break;
      case 'returns:deleteSaleReturn':
        result = returnOps.deleteSaleReturn(...args);
        break;
      case 'returns:createPurchaseReturn':
        result = returnOps.createPurchaseReturn(...args);
        break;
      case 'returns:getAllPurchaseReturns':
        result = returnOps.getAllPurchaseReturns();
        break;
      case 'returns:deletePurchaseReturn':
        result = returnOps.deletePurchaseReturn(...args);
        break;

      /* ── Parties ── */
      case 'parties:getAll':
        result = partyOps.getAll(...args);
        break;
      case 'parties:getById':
        result = partyOps.getById(...args);
        break;
      case 'parties:add':
        result = partyOps.add(...args);
        break;
      case 'parties:update':
        result = partyOps.update(...args, args[1]); // Ensure full args map
        break;
      case 'parties:delete':
        result = partyOps.delete(...args);
        break;
      case 'parties:updateBalance':
        result = partyOps.updateBalance(...args);
        break;
      case 'parties:getLedger':
        result = partyOps.getLedger(...args);
        break;
      case 'parties:recordPayment':
        result = partyOps.recordPayment(...args);
        break;

      /* ── Authentication ── */
      case 'auth:check':
        const password = authOps.getPassword();
        result = { hasPassword: !!password };
        break;
      case 'auth:verify':
        result = authOps.verify(...args);
        break;
      case 'auth:setPassword':
        try {
          authOps.setPassword(...args);
          result = { success: true };
        } catch (err) {
          result = { success: false, error: err.message };
        }
        break;

      /* ── Business Profile ── */
      case 'business:getProfile':
        result = businessProfileOps.get();
        break;
      case 'business:updateProfile':
        result = businessProfileOps.update(...args);
        break;

      /* ── Categories ── */
      case 'categories:getAll':
        result = categoryOps.getAll();
        break;
      case 'categories:add':
        result = categoryOps.add(...args);
        break;
      case 'categories:delete':
        result = categoryOps.delete(...args);
        break;

      /* ── Expense Categories ── */
      case 'expenseCategories:getAll':
        result = expenseCategoryOps.getAll();
        break;
      case 'expenseCategories:add':
        result = expenseCategoryOps.add(...args);
        break;
      case 'expenseCategories:delete':
        result = expenseCategoryOps.delete(...args);
        break;

      /* ── Product Attributes ── */
      case 'attributes:getAll':
        result = attributeOps.getAll();
        break;
      case 'attributes:add':
        result = attributeOps.add(...args);
        break;
      case 'attributes:delete':
        result = attributeOps.delete(...args);
        break;

      /* ── Mobile Access ── */
      case 'mobile:getConfig':
        result = mobileAccessOps.get();
        break;
      case 'mobile:generate':
        result = mobileAccessOps.generate();
        break;
      case 'mobile:revoke':
        result = mobileAccessOps.revoke();
        break;

      /* ── Settings ── */
      case 'settings:getGeminiKey':
        const currentProfile = businessProfileOps.get();
        const key = currentProfile?.gemini_api_key || '';
        const masked = key ? (key.substring(0, 6) + '•'.repeat(Math.max(0, key.length - 10)) + key.substring(key.length - 4)) : '';
        result = { configured: !!key, maskedKey: masked };
        break;
      case 'settings:setGeminiKey':
        db.prepare('UPDATE business_profile SET gemini_api_key = ? WHERE id = 1').run(args[0].trim());
        result = { success: true };
        break;
      case 'settings:getNeonConfig':
        const row = db.prepare('SELECT neon_db_url, use_cloud FROM business_profile WHERE id = 1').get();
        result = { url: row?.neon_db_url || '', useCloud: row?.use_cloud === 1 };
        break;
      case 'settings:setNeonConfig':
        let cleanUrl = (args[0]?.url || '').trim();
        if (cleanUrl.startsWith('psql ')) {
          cleanUrl = cleanUrl.replace(/^psql\s+['"]?|['"]?$/g, '');
        } else {
          cleanUrl = cleanUrl.replace(/^['"]|['"]$/g, '');
        }
        db.prepare('UPDATE business_profile SET neon_db_url = ?, use_cloud = ? WHERE id = 1').run(cleanUrl, args[0]?.useCloud ? 1 : 0);
        result = { success: true };
        break;
      case 'settings:resetData':
        resetDB();
        result = { success: true };
        break;
      case 'settings:syncToCloud':
        result = await syncToCloud();
        break;

      /* ── AI ── */
      case 'ai:parseInvoice':
        result = await handleParseInvoice(...args);
        break;
      case 'ai:getInsights':
        result = await handleGetInsights(...args);
        break;

      default:
        return NextResponse.json({ error: `Unknown channel ${channel}` }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('API Database handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
