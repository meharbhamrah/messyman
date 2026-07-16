"use server";

import { createClient } from "@/lib/supabase/server";
import { generateStructuredDiscovery } from "@/lib/gemini";

export async function generateTrendInsight(userId: string, period: string) {
  console.log("📊 [TRENDS] Generating insight for user:", userId, "period:", period);
  
  const supabase = await createClient();
  
  // Fetch memories with AI data
  const { data: memories } = await supabase
    .from("memories")
    .select("id, text, created_at, ai_sentiment, ai_emotions, ai_topics, ai_people, ai_activities, ai_places, ai_keywords")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(200);
  
  if (!memories || memories.length < 3) {
    return null;
  }
  
  // Filter by period
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const filtered = memories.filter(m => new Date(m.created_at) >= cutoff);
  
  if (filtered.length < 3) {
    return null;
  }
  
  // Build user data
  const allEmotions = filtered.flatMap(m => m.ai_emotions || []);
  const allTopics = filtered.flatMap(m => m.ai_topics || []);
  const allPeople = filtered.flatMap(m => m.ai_people || []);
  
  const emotionCounts: Record<string, number> = {};
  const topicCounts: Record<string, number> = {};
  const personCounts: Record<string, number> = {};
  allEmotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
  allTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  allPeople.forEach(p => { personCounts[p] = (personCounts[p] || 0) + 1; });
  
  const userData = {
    memories: filtered,
    top_emotions: Object.entries(emotionCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([e]) => e),
    top_topics: Object.entries(topicCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([t]) => t),
    top_people: Object.entries(personCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([p]) => p),
  };
  
  const discovery = await generateStructuredDiscovery(userData);
  return discovery;
}

export async function generateMoodInsight(userId: string, period: string) {
  console.log("📊 [TRENDS] Generating mood insight for user:", userId, "period:", period);
  return generateTrendInsight(userId, period);
}

export async function generateWorkInsight(userId: string, period: string) {
  console.log("📊 [TRENDS] Generating work insight for user:", userId, "period:", period);
  return generateTrendInsight(userId, period);
}
