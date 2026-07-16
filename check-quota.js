require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function checkQuota() {
  try {
    // Try a small text request (uses minimal tokens)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent("Say hello");
    const response = await result.response;
    console.log("✅ Quota available! Response:", response.text().substring(0, 50));
  } catch (error) {
    if (error.status === 429) {
      console.log("❌ Quota exceeded!");
      console.log("Error details:", error.message);
      // Try to extract retry time
      const match = error.message.match(/retry in (\d+\.?\d*)s/);
      if (match) {
        console.log(`⏳ Retry in ${match[1]} seconds`);
      }
    } else {
      console.error("Other error:", error);
    }
  }
}

checkQuota();
