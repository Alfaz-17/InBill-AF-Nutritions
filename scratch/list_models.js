const { GoogleGenAI } = require('@google/genai');

async function list() {
  const apiKey = process.env.GEMINI_API_KEY; // REMOVED HARDCODED KEY FOR SECURITY
  const ai = new GoogleGenAI({ apiKey });
  try {
    const models = await ai.models.list();
    console.log(JSON.stringify(models, null, 2));
  } catch (e) {
    console.error(e);
  }
}

list();
