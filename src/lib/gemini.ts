import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

// ============================================================
// CORE EXTRACTIONS (unchanged)
// ============================================================

export async function extractMemoryData(text: string) {
  console.log("📝 [TEXT] Analyzing...");
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = `
Analyze the following personal journal entry. Extract structured information in JSON format.
Entry: "${text}"
Return ONLY valid JSON with: summary, emotions (array), topics (array), people (array), activities (array), places (array), keywords (array), sentiment (number -1 to 1).
`;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const clean = response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(clean);
  } catch (e) { 
    console.error("❌ [TEXT] Error:", e); 
    return null; 
  }
}

export async function analyzePhoto(imageUrl: string) {
  console.log("📸 [PHOTO] Analyzing...");
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("❌ [PHOTO] Failed to fetch image:", response.status);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent([
      "Analyze this photo. Return ONLY valid JSON: { \"mood\": \"happy/sad/calm/excited/peaceful\", \"objects\": [\"object1\", \"object2\"], \"people_count\": 0, \"scene\": \"indoor/outdoor/nature/urban\", \"activity\": \"what's happening\", \"vibe\": \"peaceful/energetic\", \"sentiment\": 0.5 }",
      { inlineData: { mimeType: mimeType, data: base64 } }
    ]);
    const text = await result.response.text();
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(clean);
  } catch (e: any) {
    console.error("❌ [PHOTO] Error:", e.status, e.message);
    return null;
  }
}

export async function analyzeMusic(songTitle: string, artist: string) {
  console.log("🎵 [MUSIC] Analyzing...");
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = `
Analyze this song: "${songTitle}" by "${artist || 'Unknown'}"
Return ONLY valid JSON: { "genre": "genre", "mood": "happy/melancholic/energetic/calm", "tempo": "slow/medium/fast", "energy": "low/medium/high", "vibe": "overall vibe" }
`;
  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("❌ [MUSIC] Error:", e);
    return null;
  }
}

export async function analyzeLocation(locationName: string) {
  console.log("📍 [LOCATION] Analyzing...");
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = `
Analyze this location: "${locationName}"
Return ONLY valid JSON: { "type": "city/park/cafe/home/work/nature/other", "vibe": "urban/peaceful/natural/social", "category": "residential/commercial/natural", "sentiment": 0.0 }
`;
  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("❌ [LOCATION] Error:", e);
    return null;
  }
}

// ============================================================
// JOURNAL PROMPT – Balanced & Writable
// ============================================================

export async function generateJournalPrompt(history: string, question?: string) {
  console.log("📝 [PROMPT] Generating balanced prompt...");
  
  // For new users with no history
  if (!history || history.length < 20) {
    const starters = [
      "What's on your mind today?",
      "What's a feeling you've been carrying with you?",
      "What would you like to remember about today?",
      "What's a small moment that made you pause?",
      "What are you grateful for today?",
    ];
    return starters[Math.floor(Math.random() * starters.length)];
  }
  
  const model = genAI.getGenerativeModel({ model: MODEL });
  
  // Extract themes from history
  const themes = extractThemesFromHistory(history);
  const topThemes = themes.split(", ").slice(0, 3);
  
  // Build a balanced prompt
  const prompt = `
You are a thoughtful friend inviting someone to reflect. Based on themes from their life: "${themes}", generate ONE warm, inviting journal prompt.

The prompt should:
- Feel personal and relevant (relate to the themes)
- Be open and easy to write about (not too specific)
- Sound like a friend asking, not a therapist
- Be 1 sentence, short and simple
- Use everyday language

${question ? `They're exploring: "${question}" – the prompt can gently relate to this.` : ''}

Examples of good prompts:
- "What's something you've been thinking about a lot lately?"
- "What's a moment today that felt meaningful?"
- "What's a feeling you've been carrying with you?"

Return ONLY the prompt text. No explanations. No quotes. Just the prompt.`;

  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const clean = text.replace(/["']/g, '').trim();
    console.log("✅ [PROMPT] Generated:", clean);
    return clean;
  } catch (e) { 
    console.error("❌ [PROMPT] Error:", e); 
    return getFallbackPrompt(topThemes);
  }
}

function getFallbackPrompt(themes: string[]): string {
  const theme = themes[0] || 'life';
  
  const fallbacks = [
    `What's something you've been thinking about ${theme} lately?`,
    `When you think about ${theme}, what comes to mind?`,
    `What's a feeling that's been coming up for you lately?`,
    `What's a moment today that made you pause?`,
    `What's something you're grateful for today?`,
    `What's a question you've been asking yourself?`,
    `What's a small moment that felt meaningful?`,
    `What would you tell a friend who felt what you're feeling?`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function extractThemesFromHistory(history: string): string {
  const words = history.toLowerCase().split(/\s+/);
  const commonWords = ['the','a','an','and','or','but','for','nor','on','at','to','by','with','without','about','like','just','so','then','now','some','any','more','most','other','such','no','nor','not','only','own','same','so','than','too','very','can','will','just','should','could','would','have','has','had','do','does','did','get','got','go','went','see','saw','make','made','know','known','think','thought','feel','felt','want','wanted'];
  const wordCounts: Record<string, number> = {};
  for (const word of words) {
    if (word.length < 3 || commonWords.includes(word)) continue;
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  const sorted = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([w]) => w);
  return top.length ? top.join(", ") : "life, growth, and reflection";
}

// ============================================================
// LEGACY INSIGHT
// ============================================================

export async function generateDailyInsight(userData: any) {
  const discovery = await generateStructuredDiscovery(userData);
  return discovery?.description || null;
}

// ============================================================
// COMPATIBILITY WRAPPER
// ============================================================

export async function generateDailyDiscovery(userData: any) {
  const structured = await generateStructuredDiscovery(userData);
  return structured?.description || null;
}

// ============================================================
// STRUCTURED DISCOVERY
// ============================================================

export async function generateStructuredDiscovery(userData: any): Promise<any> {
  console.log("🔍 [DISCOVERY] Generating structured insight with model:", MODEL);
  const memories = userData.memories || [];
  if (memories.length < 3) return null;
  
  const model = genAI.getGenerativeModel({ model: MODEL });
  
  const angles = [
    "time patterns",
    "emotional patterns", 
    "relationship patterns",
    "habit patterns",
    "contrasts and shifts",
    "surprising correlations",
    "what makes you unique"
  ];
  
  const randomAngle = angles[Math.floor(Math.random() * angles.length)];
  
  const context = {
    sentiment_avg: memories.reduce((s: number, m: any) => s + (m.ai_sentiment || 0), 0) / memories.length,
    top_emotions: userData.top_emotions || [],
    top_topics: userData.top_topics || [],
    top_people: userData.top_people || [],
    time_patterns: extractTimePatterns(memories),
    contrasts: detectContrasts(memories),
    habits: detectHabits(memories),
    memory_count: memories.length,
    random_angle: randomAngle,
  };
  
  const prompt = `
You are a warm, thoughtful friend looking at someone's personal journal entries.

Based on the data below, find ONE surprising and personal observation about this person.

Focus on: ${randomAngle}

Write it:
- Directly to the person (use "you")
- In simple, everyday language
- Make it specific and surprising
- 1-2 sentences max

Data:
${JSON.stringify(context, null, 2)}

Return a JSON object with:
{
  "title": "A short, catchy title (2-3 words)",
  "description": "The observation written directly to the person in simple language",
  "stat": null,
  "type": "time | habit | contrast | relationship | milestone | correlation | emotion",
  "evidence": "A short note about the data"
}
Return ONLY the JSON object.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(clean);
    console.log("✅ [DISCOVERY] Structured insight:", parsed);
    return parsed;
  } catch (e) {
    console.error("❌ [DISCOVERY] Error:", e);
    return generateFallbackStructured(context);
  }
}

function generateFallbackStructured(context: any): any {
  const { time_patterns, contrasts, habits, top_emotions, memory_count } = context;
  
  if (time_patterns && time_patterns.bestDay) {
    return {
      title: "Weekend Mood",
      stat: null,
      description: `You are happiest on ${time_patterns.bestDay}s.`,
      type: "time",
      evidence: `Based on your entries`
    };
  }
  
  if (habits && habits.topKeyword && habits.topKeywordCount > 2) {
    return {
      title: "Your Theme",
      stat: habits.topKeywordCount,
      description: `"${habits.topKeyword}" shows up a lot in your writing.`,
      type: "habit",
      evidence: `Found in your entries`
    };
  }
  
  if (top_emotions && top_emotions.length > 0) {
    return {
      title: "Your Feeling",
      stat: null,
      description: `You often feel "${top_emotions[0]}".`,
      type: "emotion",
      evidence: `Based on your entries`
    };
  }
  
  return {
    title: "Your Journey",
    stat: memory_count,
    description: `You have written ${memory_count} memories. Keep going!`,
    type: "milestone",
    evidence: "Keep writing"
  };
}

// ============================================================
// EXTRACTION HELPERS
// ============================================================

function extractTimePatterns(memories: any[]) {
  console.log("⏰ [TIME] Analyzing patterns...");
  if (memories.length < 5) return null;
  
  const dayOfWeek: Record<string, number[]> = {};
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const hourOfDay: Record<string, number[]> = {};
  
  memories.forEach(m => {
    const date = new Date(m.created_at);
    const day = date.getDay();
    const hour = date.getHours();
    const sentiment = m.ai_sentiment || 0;
    
    if (!dayOfWeek[dayNames[day]]) dayOfWeek[dayNames[day]] = [];
    dayOfWeek[dayNames[day]].push(sentiment);
    
    const hourKey = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    if (!hourOfDay[hourKey]) hourOfDay[hourKey] = [];
    hourOfDay[hourKey].push(sentiment);
  });
  
  let bestDay = '';
  let bestDayScore = -Infinity;
  for (const [day, scores] of Object.entries(dayOfWeek)) {
    const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
    if (avg > bestDayScore && scores.length > 1) {
      bestDayScore = avg;
      bestDay = day;
    }
  }
  
  let bestHour = '';
  let bestHourScore = -Infinity;
  for (const [hour, scores] of Object.entries(hourOfDay)) {
    const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
    if (avg > bestHourScore && scores.length > 1) {
      bestHourScore = avg;
      bestHour = hour;
    }
  }
  
  return {
    bestDay,
    bestDayScore,
    bestHour,
    bestHourScore,
  };
}

function detectContrasts(memories: any[]) {
  console.log("🔄 [CONTRAST] Detecting shifts...");
  if (memories.length < 6) return null;
  
  const mid = Math.floor(memories.length / 2);
  const firstHalf = memories.slice(0, mid);
  const secondHalf = memories.slice(mid);
  
  const firstTopics = firstHalf.flatMap(m => m.ai_topics || []);
  const secondTopics = secondHalf.flatMap(m => m.ai_topics || []);
  const firstEmotions = firstHalf.flatMap(m => m.ai_emotions || []);
  const secondEmotions = secondHalf.flatMap(m => m.ai_emotions || []);
  
  const firstTopicCounts: Record<string, number> = {};
  const secondTopicCounts: Record<string, number> = {};
  firstTopics.forEach(t => { firstTopicCounts[t] = (firstTopicCounts[t] || 0) + 1; });
  secondTopics.forEach(t => { secondTopicCounts[t] = (secondTopicCounts[t] || 0) + 1; });
  
  let mostChangedTopic = '';
  let maxChange = 0;
  const allTopics = new Set([...Object.keys(firstTopicCounts), ...Object.keys(secondTopicCounts)]);
  allTopics.forEach(t => {
    const first = firstTopicCounts[t] || 0;
    const second = secondTopicCounts[t] || 0;
    const change = Math.abs(second - first) / (first + second + 1);
    if (change > maxChange) {
      maxChange = change;
      mostChangedTopic = t;
    }
  });
  
  const firstEmotionCounts: Record<string, number> = {};
  const secondEmotionCounts: Record<string, number> = {};
  firstEmotions.forEach(e => { firstEmotionCounts[e] = (firstEmotionCounts[e] || 0) + 1; });
  secondEmotions.forEach(e => { secondEmotionCounts[e] = (secondEmotionCounts[e] || 0) + 1; });
  
  let mostChangedEmotion = '';
  let maxEmotionChange = 0;
  const allEmotions = new Set([...Object.keys(firstEmotionCounts), ...Object.keys(secondEmotionCounts)]);
  allEmotions.forEach(e => {
    const first = firstEmotionCounts[e] || 0;
    const second = secondEmotionCounts[e] || 0;
    const change = Math.abs(second - first) / (first + second + 1);
    if (change > maxEmotionChange) {
      maxEmotionChange = change;
      mostChangedEmotion = e;
    }
  });
  
  return {
    mostChangedTopic,
    mostChangedEmotion,
    topicChange: maxChange,
    emotionChange: maxEmotionChange,
  };
}

function detectHabits(memories: any[]) {
  console.log("🔄 [HABITS] Detecting routines...");
  if (memories.length < 3) return null;
  
  const allKeywords = memories.flatMap(m => m.ai_keywords || []);
  const allActivities = memories.flatMap(m => m.ai_activities || []);
  const allPlaces = memories.flatMap(m => m.ai_places || []);
  
  const keywordCounts: Record<string, number> = {};
  allKeywords.forEach(k => { keywordCounts[k] = (keywordCounts[k] || 0) + 1; });
  const sortedKeywords = Object.entries(keywordCounts).sort((a,b) => b[1]-a[1]);
  const topKeyword = sortedKeywords.length > 0 ? sortedKeywords[0][0] : null;
  const topKeywordCount = sortedKeywords.length > 0 ? sortedKeywords[0][1] : 0;
  
  const activityCounts: Record<string, number> = {};
  allActivities.forEach(a => { activityCounts[a] = (activityCounts[a] || 0) + 1; });
  const sortedActivities = Object.entries(activityCounts).sort((a,b) => b[1]-a[1]);
  const topActivity = sortedActivities.length > 0 ? sortedActivities[0][0] : null;
  const topActivityCount = sortedActivities.length > 0 ? sortedActivities[0][1] : 0;
  
  const placeCounts: Record<string, number> = {};
  allPlaces.forEach(p => { placeCounts[p] = (placeCounts[p] || 0) + 1; });
  const sortedPlaces = Object.entries(placeCounts).sort((a,b) => b[1]-a[1]);
  const topPlace = sortedPlaces.length > 0 ? sortedPlaces[0][0] : null;
  const topPlaceCount = sortedPlaces.length > 0 ? sortedPlaces[0][1] : 0;
  
  return {
    topKeyword,
    topKeywordCount,
    topActivity,
    topActivityCount,
    topPlace,
    topPlaceCount,
  };
}

// ============================================================
// REVELATION REPORT
// ============================================================

export async function generateRevelationReport(userData: any, question: string) {
  console.log("📊 [REVELATION] Generating...");
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = `
You're creating a personal revelation report for someone who just completed a self-discovery journey. The report should feel like a celebration of who they are, be surprising and specific, sound warm and personal, include specific patterns from their data, and be encouraging and meaningful. Question they explored: "${question || 'What makes them who they are?'}". Data: ${JSON.stringify(userData)}. Return a JSON object with: { "title": "A catchy, personal title", "summary": "A warm, surprising summary", "sections": [ { "heading": "A surprising heading", "content": "Warm, personal content" } ], "key_takeaway": "The most surprising, meaningful thing they should know about themselves" }`;
  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    console.log("✅ [REVELATION] Generated");
    return JSON.parse(clean);
  } catch (e) { 
    console.error("❌ [REVELATION] Error:", e); 
    return {
      title: "The Real You",
      summary: "You're more complex and wonderful than you give yourself credit for.",
      sections: [
        { heading: "What we discovered", content: "You have a beautiful way of connecting with people and finding meaning in everyday moments." },
        { heading: "Your patterns", content: "The things you care about most show up again and again in your writing." }
      ],
      key_takeaway: "You already have what you're searching for – you just needed to notice it."
    };
  }
}
