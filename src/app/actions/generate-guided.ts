"use server";

import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateGuidedInvestigations(userId: string, count: number = 3) {
  console.log("🤖 [GENERATE_GUIDED] Generating", count, "guided investigations for user:", userId);
  
  const supabase = await createClient();
  
  // Fetch user's recent memories for context
  const { data: memories, error } = await supabase
    .from("memories")
    .select("text, ai_summary, ai_emotions, ai_topics, ai_people, ai_activities, ai_places, ai_keywords, ai_sentiment, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  
  if (error || !memories || memories.length < 3) {
    console.log("⚠️ [GENERATE_GUIDED] Not enough memories (need at least 3)");
    return { success: false, error: "Not enough memories" };
  }
  
  // Extract broad themes from memories
  const allTopics = memories.flatMap(m => m.ai_topics || []);
  const allEmotions = memories.flatMap(m => m.ai_emotions || []);
  const allPeople = memories.flatMap(m => m.ai_people || []);
  const allKeywords = memories.flatMap(m => m.ai_keywords || []);
  
  // Count frequencies
  const topicCounts: Record<string, number> = {};
  const emotionCounts: Record<string, number> = {};
  const personCounts: Record<string, number> = {};
  const keywordCounts: Record<string, number> = {};
  
  allTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  allEmotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
  allPeople.forEach(p => { personCounts[p] = (personCounts[p] || 0) + 1; });
  allKeywords.forEach(k => { keywordCounts[k] = (keywordCounts[k] || 0) + 1; });
  
  const topTopics = Object.entries(topicCounts).sort((a,b) => b[1]-a[1]).slice(0, 5).map(([t]) => t);
  const topEmotions = Object.entries(emotionCounts).sort((a,b) => b[1]-a[1]).slice(0, 5).map(([e]) => e);
  const topPeople = Object.entries(personCounts).sort((a,b) => b[1]-a[1]).slice(0, 5).map(([p]) => p);
  const topKeywords = Object.entries(keywordCounts).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([k]) => k);
  
  console.log("📊 [GENERATE_GUIDED] Extracted themes:", {
    topics: topTopics,
    emotions: topEmotions,
    people: topPeople,
    keywords: topKeywords.slice(0, 5)
  });

  // ============================================================
  // UPDATED PROMPT – Returns BOTH title and question separately
  // ============================================================
  const prompt = `
You are creating guided self-discovery investigations for someone.

**Context about this person:**
- They think about: ${topTopics.join(', ') || 'various aspects of life'}
- They feel: ${topEmotions.join(', ') || 'a range of emotions'}
- They mention: ${topPeople.join(', ') || 'different people'}
- Key themes: ${topKeywords.slice(0, 5).join(', ') || 'various life themes'}

**Your task:** Generate ${count} broad, generic investigation questions with clean titles.

**Rules for TITLES:**
- Must be 2-5 words maximum
- Must be a complete, readable phrase
- Must be different from the question
- Should capture the essence of the question
- Examples: "Finding Purpose", "Handling Change", "What Brings Joy", "My Core Values", "Building Resilience"

**Rules for QUESTIONS:**
- Must be 8-20 words
- Must be a complete, well-formed question
- Must start with "What", "How", or "Why"
- Should be open-ended and reflective
- Must be generic and usable by anyone

**Return format:** Return a JSON object with arrays for titles and questions.
Example:
{
  "titles": ["Finding Purpose", "Handling Change", "What Brings Joy"],
  "questions": [
    "What truly makes me feel fulfilled in life?",
    "How do I handle change and uncertainty?",
    "What brings me genuine joy?"
  ]
}

Return ONLY valid JSON. No explanations.
`;

  try {
    console.log("🤖 [GENERATE_GUIDED] Calling Gemini with updated prompt...");
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    console.log("📊 [GENERATE_GUIDED] Raw response:", text.substring(0, 300) + "...");
    
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(clean);
    
    // Handle both formats: array of strings OR object with titles/questions
    let titles: string[] = [];
    let questions: string[] = [];
    
    if (Array.isArray(parsed)) {
      // If it's an array of strings, use them as questions and generate titles
      questions = parsed.slice(0, count);
      titles = questions.map((q: string) => {
        let title = q
          .replace(/\?$/, '')
          .replace(/^(What|How|Why|Who|When|Where)\s+/, '')
          .replace(/^do\s+/, '')
          .replace(/^does\s+/, '')
          .trim();
        if (title.length > 30) title = title.substring(0, 27) + '...';
        if (title.length < 3) title = q.substring(0, 20);
        return title;
      });
    } else if (parsed.titles && parsed.questions) {
      // If it's an object with separate arrays
      titles = parsed.titles.slice(0, count);
      questions = parsed.questions.slice(0, count);
    } else {
      console.error("❌ [GENERATE_GUIDED] Unexpected format:", parsed);
      return { success: false, error: "Unexpected response format" };
    }
    
    // Ensure we have the right number
    const toGenerate = Math.min(titles.length, questions.length, count);
    
    console.log("✅ [GENERATE_GUIDED] Got", toGenerate, "investigations to create");
    
    let created = 0;
    
    for (let i = 0; i < toGenerate; i++) {
      const title = titles[i]?.trim() || `Investigation ${i + 1}`;
      const question = questions[i]?.trim() || "What would you like to explore?";
      
      // Clean up the title
      let cleanTitle = title
        .replace(/^["']|["']$/g, '')
        .replace(/\?$/, '')
        .trim();
      
      // If title is still too long or looks like a question, extract core
      if (cleanTitle.length > 30 || cleanTitle.includes('?')) {
        const words = cleanTitle.split(' ');
        // Try to get first 3-4 meaningful words
        const coreWords = words.slice(0, 3).join(' ');
        cleanTitle = coreWords || cleanTitle.substring(0, 25);
      }
      
      // Clean up the question
      let cleanQuestion = question
        .replace(/^["']|["']$/g, '')
        .trim();
      
      // Ensure question ends with ?
      if (!cleanQuestion.endsWith('?')) {
        cleanQuestion += '?';
      }
      
      // Generic description
      const description = "Explore this question to discover more about yourself and your life journey.";
      
      console.log(`📝 [GENERATE_GUIDED] Creating: "${cleanTitle}" → "${cleanQuestion}"`);
      
      // Insert into investigations table
      const { data: inv, error: invError } = await supabase
        .from("investigations")
        .insert({
          title: cleanTitle,
          question: cleanQuestion,
          description: description,
          is_custom: false,
          is_active: true,
          created_by_user: userId,
          generated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      
      if (invError) {
        console.error("❌ [GENERATE_GUIDED] Failed to insert:", invError);
      } else {
        created++;
        console.log("✅ [GENERATE_GUIDED] Created:", cleanTitle);
      }
    }
    
    console.log("✅ [GENERATE_GUIDED] Generated", created, "new guided investigations");
    return { success: true, created };
    
  } catch (error: any) {
    console.error("❌ [GENERATE_GUIDED] Error:", error);
    return { success: false, error: error.message || "Generation failed" };
  }
}
