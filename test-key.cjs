require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

console.log('🔑 API Key exists:', !!apiKey);
console.log('📦 Model:', model);

if (!apiKey) {
  console.error('❌ No API key found in .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  try {
    const genModel = genAI.getGenerativeModel({ model });
    const result = await genModel.generateContent("Say hello");
    const response = await result.response;
    console.log('✅ Gemini works! Response:', response.text());
  } catch (error) {
    console.error('❌ Gemini error:', error.message);
    if (error.status === 403) {
      console.error('  → Invalid API key. Get a new one from: https://aistudio.google.com/app/apikey');
    }
    if (error.status === 404) {
      console.error(`  → Model "${model}" not found. Try: gemini-2.0-flash-lite`);
    }
  }
}

test();
