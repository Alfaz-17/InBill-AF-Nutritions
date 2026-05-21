import { GoogleGenAI } from '@google/genai';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { base64, mimeType, geminiApiKey: clientKey } = body;

    if (!base64) {
      return NextResponse.json({ error: 'Base64 image data is required' }, { status: 400 });
    }

    let apiKey = clientKey;

    // If no client key is provided, try to fetch from Neon database
    if (!apiKey) {
      const cookieStore = await cookies();
      const neonUrl = cookieStore.get('inbill_cloud')?.value;
      if (neonUrl) {
        try {
          const sql = neon(neonUrl);
          const rows = await sql`SELECT gemini_api_key FROM business_profile WHERE id = 1`;
          apiKey = rows[0]?.gemini_api_key;
        } catch (e) {
          console.error('Failed to fetch Gemini API key from Neon:', e);
        }
      }
    }

    // Check environment variable fallback
    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is not configured. Go to Settings → Gemini Config.' }, { status: 400 });
    }

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

    return NextResponse.json({
      success: true,
      vendor: parsedData.vendor || "",
      invoice_number: parsedData.invoice_number || "",
      date: parsedData.date || "",
      invoice_total: parseFloat(parsedData.invoice_total) || lineItems.reduce((s, i) => s + i.amount, 0),
      other_charges: parseFloat(parsedData.other_charges) || 0,
      items: lineItems,
      detected_new_fields: [...detectedFields],
      detected_categories: [...detectedCategories],
    });
  } catch (err) {
    console.error("AI Parse error in route:", err);
    return NextResponse.json({ error: 'Failed to parse invoice: ' + err.message }, { status: 500 });
  }
}
