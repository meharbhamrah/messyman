import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log("API Key exists:", !!apiKey);

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

try {
  const result = await model.generateContent("Say hello in one word");
  const response = await result.response;
  console.log("✅ Gemini test response:", response.text());
} catch (error) {
  console.error("❌ Gemini error:", error.message);
}
