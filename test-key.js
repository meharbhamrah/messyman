require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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
    console.log('✅ Working with model:', model);
    console.log('Response:', response.text());
  } catch (error) {
    console.error('❌ Error with model:', model);
    console.error('Status:', error.status);
    console.error('Message:', error.message);
  }
}

test();
