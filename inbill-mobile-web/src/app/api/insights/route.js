import { GoogleGenAI } from '@google/genai';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { snapshot, geminiApiKey: clientKey } = body;

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot is required' }, { status: 400 });
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

    // If still no key, check environment variable as a fallback
    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is not configured. Go to Settings → Gemini Config.' }, { status: 400 });
    }

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
    let insights = [];
    try {
      insights = JSON.parse(resultText);
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', resultText);
      insights = [resultText];
    }

    return NextResponse.json({ success: true, insights });
  } catch (e) {
    console.error('Insights POST error:', e);
    return NextResponse.json({ error: 'Failed to generate insights: ' + e.message }, { status: 500 });
  }
}
