require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// Use the model from .env.local
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

async function testPhotoAnalysis() {
  console.log("🚀 Starting photo analysis test...");
  console.log("📋 Using model:", MODEL);
  console.log("📋 API Key exists:", !!process.env.GEMINI_API_KEY);
  
  const imageUrl = "https://picsum.photos/seed/test123/400/400";
  console.log("📸 Test image URL:", imageUrl);
  
  try {
    console.log("📥 Step 1: Fetching image...");
    const response = await fetch(imageUrl);
    console.log("✅ Response status:", response.status);
    
    if (!response.ok) {
      console.error("❌ Failed to fetch image");
      return;
    }
    
    console.log("📥 Step 2: Converting to base64...");
    const buffer = await response.arrayBuffer();
    console.log("✅ Image size:", buffer.byteLength, "bytes");
    
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    console.log("🤖 Step 3: Sending to Gemini Vision...");
    const model = genAI.getGenerativeModel({ model: MODEL });
    
    const result = await model.generateContent([
      "Analyze this photo. Return ONLY valid JSON: { \"mood\": \"happy/sad/calm/excited/peaceful\", \"objects\": [\"object1\", \"object2\"], \"people_count\": 0, \"scene\": \"indoor/outdoor/nature/urban\", \"activity\": \"what's happening\", \"vibe\": \"peaceful/energetic\", \"sentiment\": 0.5 }",
      { inlineData: { mimeType: mimeType, data: base64 } }
    ]);
    
    console.log("✅ Gemini responded!");
    const text = await result.response.text();
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(clean);
    console.log("✅ Parsed result:", parsed);
    console.log("✅ TEST PASSED!");
    
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    if (error.status) console.error("❌ Status:", error.status);
    
    if (error.status === 429) {
      console.log("\n❌ Quota exceeded for model:", MODEL);
      console.log("   → This model has rate limits.");
      console.log("   → Try switching to a different model in .env.local");
      console.log("   → Options: gemini-1.5-flash, gemini-pro, gemini-2.0-flash");
    } else if (error.status === 403) {
      console.log("❌ API key error – get a new key from Google AI Studio");
    }
  }
}

testPhotoAnalysis();
