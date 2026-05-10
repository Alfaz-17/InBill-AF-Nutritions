const { GoogleGenAI } = require('@google/genai');

async function list() {
  const apiKey = 'AIzaSyDd7WMuZBKCtbEi8P1TXNQbF6sKlPoUtqI';
  const ai = new GoogleGenAI({ apiKey });
  try {
    const models = await ai.models.list();
    console.log(JSON.stringify(models, null, 2));
  } catch (e) {
    console.error(e);
  }
}

list();
