"use server";

import { createClient } from "@/lib/supabase/server";
import { generateJournalPrompt, generateStructuredDiscovery } from "@/lib/gemini";
import { getTodayLocal, getTodayLocalStart, getTodayLocalEnd } from "@/lib/time";

// Simple seed based on date to vary results
function getDailySeed(): number {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

export async function checkAndGenerateDailyContent(userId: string) {
  console.log("📅 [DAILY] ===== STARTING for user:", userId);
  
  const supabase = await createClient();
  const todayStart = getTodayLocalStart().toISOString();
  const todayEnd = getTodayLocalEnd().toISOString();
  
  console.log("📅 [DAILY] Today range:", todayStart, "to", todayEnd);
  
  let newPrompt = null;
  let newDiscovery = null;

  // 1. Check if prompt exists for TODAY
  const { data: existingPrompt } = await supabase
    .from("journal_prompts")
    .select("id, prompt_text, generated_at")
    .eq("user_id", userId)
    .gte("generated_at", todayStart)
    .lte("generated_at", todayEnd)
    .limit(1);

  if (!existingPrompt || existingPrompt.length === 0) {
    console.log("📝 [DAILY] No prompt for today, generating...");
    const { data: memories } = await supabase
      .from("memories")
      .select("text, ai_summary, ai_topics, ai_emotions")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15);
    const history = memories?.map(m => m.text || m.ai_summary).filter(Boolean).join("\n") || "";
    const { data: inv } = await supabase
      .from("user_investigations")
      .select("investigation:investigations(question)")
      .eq("user_id", userId)
      .is("completed_at", null)
      .limit(1);
    const question = inv?.[0]?.investigation?.question;
    const promptText = await generateJournalPrompt(history, question);
    if (promptText) {
      const { data: inserted, error } = await supabase
        .from("journal_prompts")
        .insert({
          user_id: userId,
          prompt_text: promptText,
          context: question || "general",
          generated_at: new Date().toISOString(),
        })
        .select("id, prompt_text")
        .single();
      if (!error && inserted) newPrompt = inserted;
      console.log("✅ [DAILY] Prompt saved:", promptText);
    }
  } else {
    newPrompt = existingPrompt[0];
    console.log("📝 [DAILY] Prompt already exists for today:", newPrompt.prompt_text);
  }

  // 2. Check if discovery exists for TODAY
  const { data: existingDiscovery } = await supabase
    .from("insights")
    .select("id, insight_text, created_at, discovery_type, evidence")
    .eq("user_id", userId)
    .eq("type", "daily")
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd)
    .limit(1);

  if (existingDiscovery && existingDiscovery.length > 0) {
    console.log("💡 [DAILY] Discovery already exists for today:", existingDiscovery[0].insight_text);
    newDiscovery = existingDiscovery[0];
    return { prompt: newPrompt, discovery: newDiscovery };
  }

  console.log("💡 [DAILY] No discovery for today, generating structured insight...");
  
  // Fetch all memories with AI data
  const { data: memories } = await supabase
    .from("memories")
    .select("id, text, photo_url, location, song_title, song_artist, created_at, ai_summary, ai_emotions, ai_topics, ai_people, ai_activities, ai_places, ai_keywords, ai_sentiment")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(200);
  
  console.log("📊 [DAILY] Found", memories?.length || 0, "memories");

  if (memories && memories.length >= 3) {
    console.log("📊 [DAILY] Building userData for discovery...");
    
    const allEmotions = memories.flatMap(m => m.ai_emotions || []);
    const allTopics = memories.flatMap(m => m.ai_topics || []);
    const allPeople = memories.flatMap(m => m.ai_people || []);
    
    const emotionCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    const personCounts: Record<string, number> = {};
    allEmotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
    allTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
    allPeople.forEach(p => { personCounts[p] = (personCounts[p] || 0) + 1; });
    
    const userData = {
      memories: memories,
      top_emotions: Object.entries(emotionCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([e]) => e),
      top_topics: Object.entries(topicCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([t]) => t),
      top_people: Object.entries(personCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([p]) => p),
      // Add a random seed to vary results
      seed: getDailySeed(),
    };
    
    console.log("📊 [DAILY] userData prepared:", {
      top_emotions: userData.top_emotions,
      top_topics: userData.top_topics,
      top_people: userData.top_people,
      memory_count: memories.length,
      seed: userData.seed,
    });

    console.log("🤖 [DAILY] Calling Gemini for structured discovery...");
    const structured = await generateStructuredDiscovery(userData);
    console.log("🤖 [DAILY] Gemini returned:", JSON.stringify(structured, null, 2));
    
    if (structured && structured.description) {
      console.log("💾 [DAILY] Saving discovery to database:", structured.description);
      const { data: inserted, error } = await supabase
        .from("insights")
        .insert({
          user_id: userId,
          insight_text: structured.description,
          type: "daily",
          discovery_type: structured.type || 'insight',
          evidence: { structured },
          created_at: new Date().toISOString(),
        })
        .select("id, insight_text, discovery_type, evidence")
        .single();
      
      if (!error && inserted) {
        newDiscovery = inserted;
        console.log("✅ [DAILY] New structured discovery saved (type:", structured.type, ")");
        console.log("✅ [DAILY] Saved insight text:", inserted.insight_text);
      } else {
        console.error("❌ [DAILY] Error saving discovery:", error);
      }
    } else {
      console.log("⚠️ [DAILY] Gemini returned no structured insight");
    }
  } else {
    console.log(`⏳ [DAILY] Not enough memories for discovery (need 3, have ${memories?.length || 0})`);
  }

  console.log("📅 [DAILY] ===== FINISHED for user:", userId);
  return { prompt: newPrompt, discovery: newDiscovery };
}

export async function resetTodayContent(userId: string) {
  const supabase = await createClient();
  const todayStart = getTodayLocalStart().toISOString();
  const todayEnd = getTodayLocalEnd().toISOString();
  const { error: deletePrompt } = await supabase
    .from("journal_prompts")
    .delete()
    .eq("user_id", userId)
    .gte("generated_at", todayStart)
    .lte("generated_at", todayEnd);
  const { error: deleteInsight } = await supabase
    .from("insights")
    .delete()
    .eq("user_id", userId)
    .eq("type", "daily")
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);
  console.log("🗑️ [DAILY] Reset today's content for user:", userId);
}
