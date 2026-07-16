require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
console.log('Using model:', modelName);

if (!apiKey) {
  console.error('GEMINI_API_KEY not found');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say hello");
    const response = await result.response;
    console.log("✅ Gemini test response:", response.text());
  } catch (error) {
    console.error("❌ Gemini error:", error.message);
  }
}

test();
