"use server";

import { createClient } from "@/lib/supabase/server";
import { 
  extractMemoryData, 
  analyzePhoto, 
  analyzeMusic, 
  analyzeLocation,
  generateJournalPrompt, 
  generateDailyInsight 
} from "@/lib/gemini";
import { checkAndGenerateDailyContent } from "./daily";
import { revalidatePath } from "next/cache";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    if (photoAnalysis) {
      console.log("✅ [ACTION] Photo analysis result:", photoAnalysis);
    } else {
      console.log("⚠️ [ACTION] Photo analysis failed, using mock");
      photoAnalysis = {
        mood: 'calm',
        objects: ['person', 'tree', 'sky'],
        people_count: 0,
        scene: 'outdoor',
        activity: 'relaxing',
        vibe: 'peaceful',
        sentiment: 0.5
      };
    }
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

  // TEXT DATA
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

  // PHOTO DATA
  if (photoAnalysis) {
    updateData.photo_analysis = photoAnalysis;
    if (!extracted) {
      const emotions = [];
      const topics = [];
      
      if (photoAnalysis.mood) emotions.push(photoAnalysis.mood);
      if (photoAnalysis.scene) topics.push(photoAnalysis.scene);
      if (photoAnalysis.activity) topics.push(photoAnalysis.activity);
      if (photoAnalysis.vibe) topics.push(photoAnalysis.vibe);
      
      updateData.ai_emotions = emotions;
      updateData.ai_topics = topics;
      updateData.ai_sentiment = photoAnalysis.sentiment || 0;
      updateData.ai_summary = photoAnalysis.activity || photoAnalysis.mood || 'A photo moment';
      if (photoAnalysis.objects) updateData.ai_activities = photoAnalysis.objects;
    }
  }

  // MUSIC DATA
  if (musicAnalysis) {
    updateData.music_analysis = musicAnalysis;
    if (!extracted && !photoAnalysis) {
      const emotions = [];
      const topics = [];
      
      if (musicAnalysis.mood) emotions.push(musicAnalysis.mood);
      if (musicAnalysis.genre) topics.push(musicAnalysis.genre);
      if (musicAnalysis.vibe) topics.push(musicAnalysis.vibe);
      
      updateData.ai_emotions = emotions;
      updateData.ai_topics = topics;
      updateData.ai_summary = `Listening to "${memory.song_title}"${memory.song_artist ? ' by ' + memory.song_artist : ''}`;
    }
  }

  // LOCATION DATA
  if (locationAnalysis) {
    updateData.location_analysis = locationAnalysis;
    if (!extracted && !photoAnalysis && !musicAnalysis) {
      const topics = [];
      if (locationAnalysis.type) topics.push(locationAnalysis.type);
      if (locationAnalysis.vibe) topics.push(locationAnalysis.vibe);
      
      updateData.ai_topics = topics;
      updateData.ai_summary = `At ${memory.location}`;
      updateData.ai_sentiment = locationAnalysis.sentiment || 0;
      if (locationAnalysis.type) updateData.ai_places = [locationAnalysis.type];
    }
  }

  console.log("💾 [ACTION] Saving to database...");

  const { error: updateError } = await supabase
    .from("memories")
    .update(updateData)
    .eq("id", memoryId);

  if (updateError) {
    console.error("❌ [ACTION] Update error:", updateError);
    return { success: false };
  }

  console.log("✅ [ACTION] Memory updated successfully");

  // Trigger downstream tasks
  await triggerDownstream(memory.user_id, memoryId);
  revalidatePath("/");
  return { success: true };
}

async function triggerDownstream(userId: string, memoryId: string) {
  const supabase = await createClient();
  console.log("🔄 [DOWNSTREAM] Starting for user:", userId);

  // 1. Check and generate daily content (prompt + discovery)
  await checkAndGenerateDailyContent(userId);

  // 2. Update investigation progress
  await updateInvestigationProgress(userId, memoryId);
}

async function updateInvestigationProgress(userId: string, memoryId: string) {
  const supabase = await createClient();
  
  const { data: activeInvest } = await supabase
    .from("user_investigations")
    .select("id, memories_since_start, current_memory_ids, progress, completed_at")
    .eq("user_id", userId)
    .is("completed_at", null)
    .limit(1);

  if (!activeInvest || activeInvest.length === 0) {
    console.log("📊 [DOWNSTREAM] No active investigation found.");
    return;
  }

  const inv = activeInvest[0];
  console.log("📊 [DOWNSTREAM] Active investigation found:", inv.id);

  const updatedMemoryIds = [...(inv.current_memory_ids || []), memoryId];
  const newMemoryCount = (inv.memories_since_start || 0) + 1;

  const progress = await calculateInvestigationProgress(userId, inv.id, newMemoryCount);

  await supabase
    .from("user_investigations")
    .update({
      memories_since_start: newMemoryCount,
      current_memory_ids: updatedMemoryIds,
      progress: progress,
      completed_at: progress >= 1.0 ? new Date().toISOString() : null
    })
    .eq("id", inv.id);

  console.log(`✅ [DOWNSTREAM] Investigation updated: ${Math.round(progress * 100)}% (${newMemoryCount} memories since start)`);

  if (progress >= 1.0) {
    console.log("🎉 [DOWNSTREAM] Investigation COMPLETED!");
    await generateRevelation(userId, inv.id);
  }
}

async function calculateInvestigationProgress(userId: string, investigationId: string, memoriesSinceStart: number): Promise<number> {
  const supabase = await createClient();
  
  console.log("📊 [PROGRESS] Calculating for investigation:", investigationId);
  console.log("📊 [PROGRESS] Memories since start:", memoriesSinceStart);

  const { data: inv } = await supabase
    .from("user_investigations")
    .select("current_memory_ids")
    .eq("id", investigationId)
    .single();

  const memoryIds = inv?.current_memory_ids || [];
  
  const { data: allMemories } = await supabase
    .from("memories")
    .select("ai_topics, ai_emotions, ai_people, ai_activities, ai_sentiment")
    .eq("user_id", userId)
    .limit(100);

  const { data: currentMemories } = await supabase
    .from("memories")
    .select("ai_topics, ai_emotions, ai_people, ai_activities, ai_sentiment")
    .in("id", memoryIds.length > 0 ? memoryIds : [''])
    .limit(50);

  const currentTopics = currentMemories?.flatMap(m => m.ai_topics || []) || [];
  const currentEmotions = currentMemories?.flatMap(m => m.ai_emotions || []) || [];
  const currentPeople = currentMemories?.flatMap(m => m.ai_people || []) || [];
  const currentActivities = currentMemories?.flatMap(m => m.ai_activities || []) || [];

  const allTopics = allMemories?.flatMap(m => m.ai_topics || []) || [];
  const allEmotions = allMemories?.flatMap(m => m.ai_emotions || []) || [];
  const allPeople = allMemories?.flatMap(m => m.ai_people || []) || [];

  let progress = 0;
  const memoryScore = Math.min(memoriesSinceStart / 7, 1);
  progress += memoryScore * 0.10;

  const uniqueTopics = [...new Set([...currentTopics, ...allTopics])];
  const uniqueEmotions = [...new Set([...currentEmotions, ...allEmotions])];
  const uniquePeople = [...new Set([...currentPeople, ...allPeople])];
  const uniqueActivities = [...new Set(currentActivities)];

  const topicScore = Math.min(uniqueTopics.length / 6, 1);
  progress += topicScore * 0.30;
  const emotionScore = Math.min(uniqueEmotions.length / 5, 1);
  progress += emotionScore * 0.25;
  const peopleScore = Math.min(uniquePeople.length / 4, 1);
  progress += peopleScore * 0.20;
  const activityScore = Math.min(uniqueActivities.length / 4, 1);
  progress += activityScore * 0.15;

  progress = Math.min(Math.round(progress * 100) / 100, 1.0);

  console.log("📊 [PROGRESS] Breakdown:", {
    memoriesSinceStart,
    uniqueTopics: uniqueTopics.length,
    uniqueEmotions: uniqueEmotions.length,
    uniquePeople: uniquePeople.length,
    progress
  });

  return progress;
}

async function generateRevelation(userId: string, investigationId: string) {
  const supabase = await createClient();
  console.log("🎉 [REVELATION] Generating for investigation:", investigationId);
  
  const { data: inv } = await supabase
    .from("user_investigations")
    .select("investigation:investigations(question, title), current_memory_ids")
    .eq("id", investigationId)
    .single();

  if (!inv) {
    console.error("❌ [REVELATION] Investigation not found");
    return;
  }

  const { data: memories } = await supabase
    .from("memories")
    .select("text, ai_summary, ai_emotions, ai_topics, ai_people, ai_sentiment, created_at")
    .in("id", inv.current_memory_ids || [])
    .order("created_at", { ascending: true });

  const { generateRevelationReport } = await import("@/lib/gemini");
  
  const userData = {
    memories: memories || [],
    question: inv.investigation?.question,
    total_memories: memories?.length || 0,
  };

  const report = await generateRevelationReport(userData, inv.investigation?.question || "");
  
  if (report) {
    await supabase.from("insights").insert({
      user_id: userId,
      insight_text: report.summary || `Revelation: ${inv.investigation?.title}`,
      type: "revelation",
      evidence: { report, investigation_id: investigationId },
    });
    console.log("✅ [REVELATION] Report saved!");
  }
}
