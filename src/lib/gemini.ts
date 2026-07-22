import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

console.log("🔧 [GEMINI] Initialized with model:", MODEL);
console.log("🔧 [GEMINI] API Key exists:", !!apiKey);

const genAI = new GoogleGenerativeAI(apiKey);

// ============================================================
// HELPER: Try models with fallback
// ============================================================

async function tryModels(prompt: any, modelNames: string[] = [MODEL, "gemini-1.5-flash", "gemini-pro"]): Promise<any> {
  let lastError = null;
  
  for (const modelName of modelNames) {
    try {
      console.log(`📦 [GEMINI] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      console.log(`✅ [GEMINI] Success with ${modelName}`);
      return response;
    } catch (error: any) {
      console.warn(`⚠️ [GEMINI] ${modelName} failed:`, error.message);
      if (error.status) console.warn(`   Status: ${error.status}`);
      lastError = error;
    }
  }
  
  throw lastError || new Error("All models failed");
}

// ============================================================
// CORE EXTRACTIONS
// ============================================================

export async function extractMemoryData(text: string) {
  console.log("📝 [TEXT] Analyzing...");
  const prompt = `
Analyze the following personal journal entry. Extract structured information in JSON format.
Entry: "${text}"
Return ONLY valid JSON with: summary, emotions (array), topics (array), people (array), activities (array), places (array), keywords (array), sentiment (number -1 to 1).
`;
  try {
    const response = await tryModels(prompt);
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
    
    const prompt = [
      "Analyze this photo. Return ONLY valid JSON: { \"mood\": \"happy/sad/calm/excited/peaceful\", \"objects\": [\"object1\", \"object2\"], \"people_count\": 0, \"scene\": \"indoor/outdoor/nature/urban\", \"activity\": \"what's happening\", \"vibe\": \"peaceful/energetic\", \"sentiment\": 0.5 }",
      { inlineData: { mimeType: mimeType, data: base64 } }
    ];
    
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
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
  const prompt = `
Analyze this song: "${songTitle}" by "${artist || 'Unknown'}"
Return ONLY valid JSON: { "genre": "genre", "mood": "happy/melancholic/energetic/calm", "tempo": "slow/medium/fast", "energy": "low/medium/high", "vibe": "overall vibe" }
`;
  try {
    const response = await tryModels(prompt);
    const clean = response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("❌ [MUSIC] Error:", e);
    return null;
  }
}

export async function analyzeLocation(locationName: string) {
  console.log("📍 [LOCATION] Analyzing...");
  const prompt = `
Analyze this location: "${locationName}"
Return ONLY valid JSON: { "type": "city/park/cafe/home/work/nature/other", "vibe": "urban/peaceful/natural/social", "category": "residential/commercial/natural", "sentiment": 0.0 }
`;
  try {
    const response = await tryModels(prompt);
    const clean = response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("❌ [LOCATION] Error:", e);
    return null;
  }
}

// ============================================================
// JOURNAL PROMPT
// ============================================================

export async function generateJournalPrompt(history: string, question?: string) {
  console.log("📝 [PROMPT] Generating...");
  if (!history || history.length < 20) {
    const starters = [
      "What's something you've been thinking about lately?",
      "How are you feeling today, really?",
      "What's a small moment that made you smile recently?",
    ];
    return starters[Math.floor(Math.random() * starters.length)];
  }
  const themes = extractThemesFromHistory(history);
  const prompt = `You're a thoughtful friend inviting someone to reflect. Based on themes from their life: "${themes}", generate ONE warm, inviting journal prompt. The prompt should feel personal and relevant, be open and easy to write about, and sound like a friend asking. ${question ? `They're exploring: "${question}" – the prompt can gently relate to this.` : ''} Return ONLY the prompt text.`;
  try {
    const response = await tryModels(prompt);
    return response.text().replace(/["']/g, '').trim();
  } catch (e) { 
    console.error("❌ [PROMPT] Error:", e); 
    const templates = [
      `What's something you've been learning about ${themes.split(',')[0] || 'life'} lately?`,
      `When you think about ${themes.split(',')[0] || 'life'}, what comes to mind?`,
      `What's a moment recently that made you think about ${themes.split(',')[0] || 'life'}?`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
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
  console.log("🔍 [DISCOVERY] Generating structured insight...");
  const memories = userData.memories || [];
  if (memories.length < 3) return null;
  
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
    const response = await tryModels(prompt);
    const clean = response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
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
// AI-POWERED RELEVANCE
// ============================================================

export async function calculateRelevanceWithAI(
  memory: any,
  investigationQuestion: string,
  investigationTitle: string
): Promise<number> {
  console.log("🤖 [RELEVANCE] Using AI to calculate relevance...");
  console.log("🤖 [RELEVANCE] Question:", investigationQuestion);
  console.log("🤖 [RELEVANCE] Title:", investigationTitle);
  
  const memoryData = {
    text: memory.text || '',
    summary: memory.ai_summary || '',
    emotions: memory.ai_emotions || [],
    topics: memory.ai_topics || [],
    people: memory.ai_people || [],
    activities: memory.ai_activities || [],
    places: memory.ai_places || [],
    keywords: memory.ai_keywords || [],
    sentiment: memory.ai_sentiment || 0,
  };
  
  const prompt = `
You are a relevance analyzer for a personal journal app.

**Investigation:** "${investigationTitle}"
**Question:** "${investigationQuestion}"

**Memory:**
- Text: "${memoryData.text}"
- Summary: "${memoryData.summary}"
- Emotions: ${memoryData.emotions.join(', ')}
- Topics: ${memoryData.topics.join(', ')}
- People: ${memoryData.people.join(', ')}
- Activities: ${memoryData.activities.join(', ')}
- Places: ${memoryData.places.join(', ')}
- Keywords: ${memoryData.keywords.join(', ')}

**Task:** Rate how relevant this memory is to the investigation on a scale of 0 to 1.
- 0 = completely irrelevant
- 0.3 = somewhat relevant (mentions related topics but not directly)
- 0.6 = moderately relevant (directly related to the investigation)
- 1.0 = highly relevant (directly answers or provides key evidence)

Return ONLY a number between 0 and 1. No other text.
`;

  try {
    const response = await tryModels(prompt);
    const text = response.text();
    const score = parseFloat(text.trim());
    console.log("🤖 [RELEVANCE] AI score:", score);
    return Math.max(0, Math.min(1, score));
  } catch (e) {
    console.error("❌ [RELEVANCE] AI failed, using keyword fallback:", e);
    return calculateRelevanceWithKeywords(memory, investigationQuestion);
  }
}

// ============================================================
// FALLBACK: Keyword-Based Relevance
// ============================================================

export function calculateRelevanceWithKeywords(
  memory: any,
  investigationQuestion: string
): number {
  console.log("📊 [RELEVANCE] Using keyword fallback...");
  
  const topics = memory.ai_topics || [];
  const emotions = memory.ai_emotions || [];
  const people = memory.ai_people || [];
  const keywords = memory.ai_keywords || [];
  const text = (memory.text || "").toLowerCase();
  const summary = (memory.ai_summary || "").toLowerCase();
  
  const questionWords = investigationQuestion.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  let score = 0;
  
  const matchingTopics = topics.filter((t: string) => 
    questionWords.some(qw => t.toLowerCase().includes(qw))
  );
  if (matchingTopics.length > 0) score += 0.3;
  
  const textMatches = questionWords.filter(qw => text.includes(qw) || summary.includes(qw));
  if (textMatches.length > 2) score += 0.2;
  else if (textMatches.length > 0) score += 0.1;
  
  if (people && people.length > 0) score += 0.2;
  
  if (emotions && emotions.length > 0) score += 0.15;
  
  const keywordMatches = keywords.filter((k: string) => 
    questionWords.some(qw => k.toLowerCase().includes(qw))
  );
  if (keywordMatches.length > 0) score += 0.15;
  
  console.log("📊 [RELEVANCE] Keyword score:", Math.min(score, 1.0));
  return Math.min(score, 1.0);
}

// ============================================================
// GENERATE INVESTIGATION SUGGESTIONS – Open-ended & Balanced
// ============================================================

export async function generateInvestigationSuggestions(userData: any): Promise<string[]> {
  console.log("🤖 [SUGGESTIONS] Generating investigation suggestions...");
  console.log("🤖 [SUGGESTIONS] Model:", MODEL);
  console.log("🤖 [SUGGESTIONS] API Key exists:", !!apiKey);
  
  if (!apiKey) {
    console.error("❌ [SUGGESTIONS] No API key found!");
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    console.log("🤖 [SUGGESTIONS] Model created successfully");
    
    const memories = userData.memories || [];
    const memoryTexts = memories.slice(0, 10).map((m: any) => 
      `"${m.text || m.ai_summary || ''}"`
    ).join('\n');
    
    console.log("🤖 [SUGGESTIONS] Number of memories:", memories.length);
    console.log("🤖 [SUGGESTIONS] Memory texts length:", memoryTexts.length);
    
    const prompt = `
Based on this person's journal entries, suggest 5 broad, open-ended investigation questions they might want to explore about themselves.

Their recent entries:
${memoryTexts}

The questions should:
- Be broad and open-ended (not too specific)
- Help them discover patterns about their life
- Be reflective and personal
- Cover different life areas (emotions, relationships, work, growth, well-being)
- Feel like a friend asking a thoughtful question

**Examples of good questions:**
- "What truly makes me feel fulfilled?"
- "How do I handle change and uncertainty?"
- "What patterns shape my relationships?"
- "What gives me a sense of purpose?"
- "How do I respond to stress and challenge?"

**Examples of bad questions (too specific):**
- "Why did my ex and I break up?"
- "How do I cope with my boss's criticism?"
- "What should I do about my anxiety at work?"

Return ONLY an array of 5 strings. No explanations. No additional text.
`;

    console.log("🤖 [SUGGESTIONS] Sending to Gemini...");
    const result = await model.generateContent(prompt);
    console.log("🤖 [SUGGESTIONS] Received response from Gemini");
    
    const text = await result.response.text();
    console.log("🤖 [SUGGESTIONS] Raw response:", text.substring(0, 200) + "...");
    
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const suggestions = JSON.parse(clean);
    
    console.log("✅ [SUGGESTIONS] Generated", suggestions.length, "suggestions");
    return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
  } catch (error: any) {
    console.error("❌ [SUGGESTIONS] Error:", error);
    console.error("❌ [SUGGESTIONS] Status:", error.status);
    console.error("❌ [SUGGESTIONS] Message:", error.message);
    if (error.errorDetails) {
      console.error("❌ [SUGGESTIONS] Details:", JSON.stringify(error.errorDetails, null, 2));
    }
    return [];
  }
}

// ============================================================
// REVELATION REPORT
// ============================================================

export async function generateRevelationReport(userData: any, question: string) {
  console.log("📊 [REVELATION] Generating report...");
  
  const memories = userData.memories || [];
  const memoryTexts = memories.map((m: any) => 
    `Memory: "${m.text || m.ai_summary || ''}"\nEmotions: ${m.ai_emotions?.join(', ') || 'None'}\nTopics: ${m.ai_topics?.join(', ') || 'None'}\nPeople: ${m.ai_people?.join(', ') || 'None'}\nSentiment: ${m.ai_sentiment || 0}`
  ).join('\n---\n');

  const prompt = `
You are creating a personal revelation report for someone who just completed a self-discovery investigation.

**Investigation Question:** "${question}"

**Their memories:**
${memoryTexts}

**Your task:** Create a surprising, personal, and human report. This should feel like a friend sharing observations they've noticed about you, not a robot analyzing data.

**Rules:**
1. Write directly to the person (use "you")
2. Find patterns they wouldn't notice themselves – especially CONTRADICTIONS and SURPRISING patterns
3. Be specific – reference actual details from their memories
4. Sound warm and human, like a close friend
5. Make it surprising

**The report structure:**
- Title: A catchy, personal title (3-5 words)
- Summary: One surprising observation
- 3 sections with headings and content
- Key takeaway: The most meaningful thing they should know

Return a JSON object with:
{
  "title": "catchy personal title",
  "summary": "one surprising observation",
  "sections": [
    { "heading": "surprising heading", "content": "specific, personal content" },
    { "heading": "another surprising heading", "content": "more specific content" },
    { "heading": "the most surprising heading", "content": "the wow moment" }
  ],
  "key_takeaway": "the most meaningful thing they should know"
}
`;

  try {
    const response = await tryModels(prompt);
    const text = response.text();
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
