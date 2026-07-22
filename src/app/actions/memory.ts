"use server";

import { createClient } from "@/lib/supabase/server";
import { 
  extractMemoryData, 
  analyzePhoto, 
  analyzeMusic, 
  analyzeLocation,
  generateJournalPrompt, 
  generateDailyInsight,
  generateRevelationReport,
  calculateRelevanceWithAI,
  calculateRelevanceWithKeywords
} from "@/lib/gemini";
import { checkAndGenerateDailyContent } from "./daily";
import { revalidatePath } from "next/cache";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function capitalizeText(text: string): string {
  if (!text) return text;
  return text.split('. ').map(sentence => {
    if (sentence.length === 0) return sentence;
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }).join('. ');
}

export async function processMemory(memoryId: string) {
  console.log("🔍 [ACTION] processMemory called for:", memoryId);
  
  const supabase = await createClient();
  const { data: memory, error } = await supabase
    .from("memories")
    .select("id, text, user_id, photo_url, song_title, song_artist, location, created_at")
    .eq("id", memoryId)
    .single();

  if (error || !memory) {
    console.error("❌ [ACTION] Memory not found:", error);
    return { success: false };
  }

  const hasText = memory.text && memory.text.length > 0;
  const hasPhoto = !!memory.photo_url;
  const hasMusic = memory.song_title && memory.song_title.length > 0;
  const hasLocation = memory.location && memory.location.length > 0;

  console.log("📝 [ACTION] Inputs:", { hasText, hasPhoto, hasMusic, hasLocation });

  let extracted = null;
  let photoAnalysis = null;
  let musicAnalysis = null;
  let locationAnalysis = null;

  // 1. TEXT ANALYSIS
  if (hasText) {
    console.log("📝 [ACTION] Analyzing text...");
    extracted = await extractMemoryData(memory.text);
    await delay(500);
  }

  // 2. PHOTO ANALYSIS
  if (hasPhoto) {
    console.log("📸 [ACTION] Analyzing photo...");
    photoAnalysis = await analyzePhoto(memory.photo_url);
    await delay(500);
  }

  // 3. MUSIC ANALYSIS
  if (hasMusic) {
    console.log("🎵 [ACTION] Analyzing music...");
    musicAnalysis = await analyzeMusic(memory.song_title, memory.song_artist || "");
    await delay(500);
  }

  // 4. LOCATION ANALYSIS
  if (hasLocation) {
    console.log("📍 [ACTION] Analyzing location...");
    locationAnalysis = await analyzeLocation(memory.location);
  }

  // Build update data
  const updateData: any = {
    ai_processed: true,
    ai_processed_at: new Date().toISOString(),
  };

  if (extracted) {
    updateData.ai_summary = extracted.summary || null;
    updateData.ai_emotions = extracted.emotions || [];
    updateData.ai_topics = extracted.topics || [];
    updateData.ai_people = extracted.people || [];
    updateData.ai_activities = extracted.activities || [];
    updateData.ai_places = extracted.places || [];
    updateData.ai_keywords = extracted.keywords || [];
    updateData.ai_sentiment = extracted.sentiment || 0;
  }

  if (photoAnalysis) updateData.photo_analysis = photoAnalysis;
  if (musicAnalysis) updateData.music_analysis = musicAnalysis;
  if (locationAnalysis) updateData.location_analysis = locationAnalysis;

  console.log("💾 [ACTION] Saving memory to database...");

  const { error: updateError } = await supabase
    .from("memories")
    .update(updateData)
    .eq("id", memoryId);

  if (updateError) {
    console.error("❌ [ACTION] Update error:", updateError);
    return { success: false };
  }

  console.log("✅ [ACTION] Memory updated successfully");

  await triggerDownstream(memory.user_id, memoryId);
  revalidatePath("/");
  return { success: true };
}

async function triggerDownstream(userId: string, memoryId: string) {
  const supabase = await createClient();
  console.log("🔄 [DOWNSTREAM] Starting for user:", userId);

  await checkAndGenerateDailyContent(userId);
  await updateInvestigationProgress(userId, memoryId);
}

async function updateInvestigationProgress(userId: string, memoryId: string) {
  const supabase = await createClient();
  console.log("📊 [PROGRESS] Starting investigation update for user:", userId);
  
  const { data: activeInvest, error: fetchError } = await supabase
    .from("user_investigations")
    .select("id, investigation_id, progress, completed_at, memories_since_start, current_memory_ids, investigation:investigations(question, title, is_custom)")
    .eq("user_id", userId)
    .is("completed_at", null)
    .limit(1);

  if (fetchError) {
    console.error("❌ [PROGRESS] Error fetching active investigation:", fetchError);
    return;
  }

  if (!activeInvest || activeInvest.length === 0) {
    console.log("📊 [PROGRESS] No active investigation found.");
    return;
  }

  const inv = activeInvest[0];
  const investigationQuestion = inv.investigation?.question || "";
  const investigationTitle = inv.investigation?.title || "";
  const isCustom = inv.investigation?.is_custom || false;
  
  console.log("📊 [PROGRESS] Active investigation:", {
    id: inv.id,
    title: investigationTitle,
    question: investigationQuestion,
    isCustom,
    current_memories: inv.memories_since_start
  });

  const { data: memory } = await supabase
    .from("memories")
    .select("text, ai_summary, ai_emotions, ai_topics, ai_people, ai_activities, ai_keywords, ai_sentiment")
    .eq("id", memoryId)
    .single();

  if (!memory) {
    console.error("❌ [PROGRESS] Memory not found");
    return;
  }

  let relevance = 0;
  try {
    relevance = await calculateRelevanceWithAI(memory, investigationQuestion, investigationTitle);
  } catch (e) {
    console.error("❌ [PROGRESS] AI relevance failed, using fallback:", e);
    relevance = calculateRelevanceWithKeywords(memory, investigationQuestion);
  }
  
  console.log("📊 [PROGRESS] Memory relevance:", relevance);

  if (relevance < 0.2) {
    console.log("⏳ [PROGRESS] Memory not relevant enough (needs > 0.2), skipping");
    return;
  }

  const updatedMemoryIds = [...(inv.current_memory_ids || []), memoryId];
  const relevantMemoryCount = (inv.memories_since_start || 0) + 1;

  console.log("📊 [PROGRESS] Adding relevant memory:", {
    memoryId,
    relevantMemoryCount,
    totalRelevant: updatedMemoryIds.length,
    relevance
  });

  const progress = Math.min(relevantMemoryCount / 7, 1.0);
  console.log("📊 [PROGRESS] Progress:", progress);

  const updateData: any = {
    memories_since_start: relevantMemoryCount,
    current_memory_ids: updatedMemoryIds,
    progress: progress,
  };

  const isComplete = relevantMemoryCount >= 7;
  if (isComplete) {
    console.log("🎉 [PROGRESS] Investigation COMPLETED with", relevantMemoryCount, "relevant memories!");
    updateData.completed_at = new Date().toISOString();
    await generateRevelationForInvestigation(userId, inv.investigation_id, updatedMemoryIds);
  }

  const { error: updateError } = await supabase
    .from("user_investigations")
    .update(updateData)
    .eq("id", inv.id);

  if (updateError) {
    console.error("❌ [PROGRESS] Error updating investigation:", updateError);
  } else {
    console.log(`✅ [PROGRESS] Investigation updated: ${Math.round(progress * 100)}% (${relevantMemoryCount}/7 relevant memories)`);
  }
}

async function generateRevelationForInvestigation(userId: string, investigationId: string, memoryIds: string[]) {
  const supabase = await createClient();
  console.log("🎉 [REVELATION] Generating for investigation:", investigationId);
  
  const { data: inv } = await supabase
    .from("investigations")
    .select("title, question")
    .eq("id", investigationId)
    .single();

  if (!inv) {
    console.error("❌ [REVELATION] Investigation not found");
    return;
  }

  const { data: memories } = await supabase
    .from("memories")
    .select("text, ai_summary, ai_emotions, ai_topics, ai_people, ai_sentiment, photo_analysis, music_analysis, location_analysis, created_at")
    .in("id", memoryIds)
    .order("created_at", { ascending: true });

  if (!memories || memories.length === 0) {
    console.error("❌ [REVELATION] No memories found");
    return;
  }

  console.log("📊 [REVELATION] Using", memories.length, "relevant memories");

  const userData = {
    memories: memories,
    question: inv.question,
    total_memories: memories.length,
    title: inv.title,
  };

  const report = await generateRevelationReport(userData, inv.question || "");
  
  if (report) {
    report.title = capitalizeText(report.title);
    report.summary = capitalizeText(report.summary);
    if (report.sections) {
      report.sections = report.sections.map((s: any) => ({
        heading: capitalizeText(s.heading),
        content: capitalizeText(s.content)
      }));
    }
    report.key_takeaway = capitalizeText(report.key_takeaway);
    
    const { error: insertError } = await supabase.from("insights").insert({
      user_id: userId,
      insight_text: report.summary || `Revelation: ${inv.title}`,
      type: "revelation",
      discovery_type: "revelation",
      evidence: { 
        report: report,
        investigation_id: investigationId,
        memory_count: memories.length,
      },
      created_at: new Date().toISOString(),
    });
    
    if (insertError) {
      console.error("❌ [REVELATION] Error saving report:", insertError);
    } else {
      console.log("✅ [REVELATION] Report saved!");
    }
  }
}
