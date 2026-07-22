"use server";

import { createClient } from "@/lib/supabase/server";
import { generateInvestigationSuggestions } from "@/lib/gemini";

export async function getInvestigationSuggestions(userId: string) {
  console.log("📊 [SUGGESTIONS ACTION] Getting suggestions for user:", userId);
  
  try {
    const supabase = await createClient();
    
    // Get user's memories
    const { data: memories, error } = await supabase
      .from("memories")
      .select("text, ai_summary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) {
      console.error("❌ [SUGGESTIONS ACTION] Error fetching memories:", error);
      return { success: false, error: "Failed to fetch memories" };
    }

    console.log("📊 [SUGGESTIONS ACTION] Found", memories?.length || 0, "memories");

    const userData = {
      memories: memories || [],
      top_emotions: [],
      top_topics: [],
      top_people: [],
    };

    const suggestions = await generateInvestigationSuggestions(userData);
    
    if (suggestions && suggestions.length > 0) {
      console.log("✅ [SUGGESTIONS ACTION] Generated", suggestions.length, "suggestions");
      return { success: true, suggestions };
    } else {
      console.log("⚠️ [SUGGESTIONS ACTION] No suggestions generated");
      return { success: true, suggestions: [] };
    }
  } catch (error: any) {
    console.error("❌ [SUGGESTIONS ACTION] Error:", error);
    return { success: false, error: error.message || "Failed to generate suggestions" };
  }
}
