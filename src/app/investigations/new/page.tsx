"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Send, Loader2, Lightbulb, Plus, X, AlertCircle, Bug } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { getInvestigationSuggestions } from "@/app/actions/suggestions";

// Debug helper to log objects safely
const debugLog = (label: string, data: any) => {
  console.log(`🐛 [DEBUG] ${label}:`, JSON.stringify(data, null, 2));
};

// Error helper to extract meaningful error messages
const extractErrorMessage = (error: any): string => {
  if (!error) return "Unknown error occurred";
  
  // Supabase error
  if (error.code && error.message) {
    return `[${error.code}] ${error.message}`;
  }
  
  // Standard Error object
  if (error.message) {
    return error.message;
  }
  
  // String error
  if (typeof error === 'string') {
    return error;
  }
  
  // Try to stringify the error
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error format";
  }
};

export default function NewInvestigationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      console.log("🔐 [AUTH] Getting user...");
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error("❌ [AUTH] Error getting user:", error);
          router.push("/login");
          return;
        }
        if (!user) {
          console.warn("⚠️ [AUTH] No user found, redirecting to login");
          router.push("/login");
          return;
        }
        console.log("✅ [AUTH] User authenticated:", user.email);
        setUser(user);
      } catch (error) {
        console.error("❌ [AUTH] Unexpected error:", error);
        router.push("/login");
      }
    };
    getUser();
  }, [router, supabase]);

  const generateSuggestions = async () => {
    if (!user) {
      console.warn("⚠️ [SUGGESTIONS] No user, cannot generate suggestions");
      setSuggestionError("Please log in to generate suggestions.");
      return;
    }
    
    console.log("📊 [SUGGESTIONS] Generating suggestions for user:", user.id);
    setLoadingSuggestions(true);
    setSuggestionError(null);
    setDebugInfo(null);
    
    try {
      const result = await getInvestigationSuggestions(user.id);
      console.log("📊 [SUGGESTIONS] Result:", result);
      
      if (result.success && result.suggestions && result.suggestions.length > 0) {
        console.log("✅ [SUGGESTIONS] Received", result.suggestions.length, "suggestions");
        setSuggestions(result.suggestions);
        setShowSuggestions(true);
        setDebugInfo(`Generated ${result.suggestions.length} suggestions successfully`);
      } else if (result.success) {
        console.warn("⚠️ [SUGGESTIONS] No suggestions generated");
        setSuggestionError("No suggestions generated. Try writing more memories first.");
      } else {
        console.error("❌ [SUGGESTIONS] Failed:", result.error);
        setSuggestionError(result.error || "Failed to generate suggestions. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ [SUGGESTIONS] Exception:", error);
      setSuggestionError(extractErrorMessage(error));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    console.log("📝 [APPLY] Applying suggestion:", suggestion);
    
    // Generate a clean, concise title from the suggestion
    let cleanTitle = suggestion;
    
    // Remove question mark
    cleanTitle = cleanTitle.replace(/\?$/, '');
    
    // Remove quotes if present
    cleanTitle = cleanTitle.replace(/^["']|["']$/g, '');
    
    // Common patterns for extraction
    const patterns = [
      // Pattern: "What truly makes me feel fulfilled?" -> "What Makes Me Feel Fulfilled"
      { regex: /^What\s+(truly|really|actually)?\s*(makes|gives|is|are)\s+me\s+/, replacement: 'What ' },
      // Pattern: "How do I handle change and uncertainty?" -> "How I Handle Change"
      { regex: /^How\s+(do|can|should)\s+I\s+/, replacement: 'How I ' },
      // Pattern: "What patterns shape my relationships?" -> "Patterns That Shape My Relationships"
      { regex: /^What\s+(\w+)\s+(shape|define|influence|affect)\s+my\s+/, replacement: '$1 That $2 My ' },
      // Pattern: "Why do I feel anxious at work?" -> "Why I Feel Anxious at Work"
      { regex: /^Why\s+(do|does|is|are)\s+I\s+/, replacement: 'Why I ' },
      // Pattern: "What gives me a sense of purpose?" -> "What Gives Me Purpose"
      { regex: /^What\s+gives\s+me\s+/, replacement: 'What Gives Me ' },
    ];

    let title = cleanTitle;

    // Try each pattern
    for (const pattern of patterns) {
      if (pattern.regex.test(cleanTitle)) {
        title = cleanTitle.replace(pattern.regex, pattern.replacement);
        // Clean up any double spaces
        title = title.replace(/\s{2,}/g, ' ');
        break;
      }
    }

    // If title is still too long or unchanged, try a simpler approach
    if (title.length > 60 || title === cleanTitle) {
      // Try to extract the core subject (first 4-5 meaningful words)
      const words = cleanTitle.split(' ');
      // Remove common stop words
      const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to', 'by', 'with', 'without'];
      const meaningfulWords = words.filter(w => !stopWords.includes(w.toLowerCase()));
      
      if (meaningfulWords.length > 5) {
        title = meaningfulWords.slice(0, 5).join(' ') + '...';
      } else if (meaningfulWords.length > 3) {
        title = meaningfulWords.join(' ');
      } else {
        title = cleanTitle;
      }
    }

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    // Ensure title is not too long (max 60 chars)
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }

    // If title is empty or just a single word, use a fallback
    if (!title || title.length < 3) {
      // Generate a fallback title from the full question
      const fallbackWords = cleanTitle.split(' ').slice(0, 5);
      title = fallbackWords.join(' ') + '...';
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Make sure title and question are different
    // If title is too similar to the full question, truncate it
    if (title.length > 20 && title === cleanTitle) {
      const words = cleanTitle.split(' ');
      if (words.length > 4) {
        title = words.slice(0, 4).join(' ') + '...';
      } else {
        title = words.slice(0, 3).join(' ');
      }
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    console.log('✅ [APPLY] Generated title:', title);
    console.log('✅ [APPLY] Full question:', suggestion);

    setTitle(title);
    setQuestion(suggestion);
    setShowSuggestions(false);
    setDebugInfo(`Applied suggestion: "${suggestion}"`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🚀 [SUBMIT] Starting investigation creation...");
    
    // Validate inputs
    if (!title || !question) {
      console.warn("⚠️ [SUBMIT] Missing title or question");
      alert("Please provide a title and question.");
      return;
    }

    // Verify user exists
    if (!user) {
      console.error("❌ [SUBMIT] No user found");
      alert("Please log in first.");
      return;
    }

    console.log("📝 [SUBMIT] User ID:", user.id);
    console.log("📝 [SUBMIT] Title:", title);
    console.log("📝 [SUBMIT] Question:", question);
    console.log("📝 [SUBMIT] Description:", description || "(none)");

    setLoading(true);
    setDebugInfo(null);
    
    try {
      // Step 1: Check for active investigation
      console.log("🔍 [SUBMIT] Step 1: Checking for active investigation...");
      const { data: active, error: activeError } = await supabase
        .from("user_investigations")
        .select("id, investigation_id, progress, started_at")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .limit(1);

      if (activeError) {
        console.error("❌ [SUBMIT] Active check error:", activeError);
        debugLog("Active check error details", activeError);
        throw new Error(`Active check failed: ${extractErrorMessage(activeError)}`);
      }

      if (active && active.length > 0) {
        console.warn("⚠️ [SUBMIT] User has active investigation:", active[0]);
        alert("You already have an active investigation. Please complete it first.");
        setLoading(false);
        return;
      }

      console.log("✅ [SUBMIT] Step 1: No active investigation found");

      // Step 2: Create investigation
      console.log("🔍 [SUBMIT] Step 2: Creating investigation...");
      const investigationData = {
        title: title.trim(),
        question: question.trim(),
        description: description?.trim() || null,
        is_custom: true,
        created_by_user: user.id,
        custom_question: question.trim(),
        is_active: true,
      };
      
      debugLog("Investigation data", investigationData);

      const { data: inv, error: invError } = await supabase
        .from("investigations")
        .insert(investigationData)
        .select()
        .single();

      if (invError) {
        console.error("❌ [SUBMIT] Investigation insert error:", invError);
        debugLog("Investigation error details", invError);
        
        // Check for specific errors
        if (invError.code === '23503') {
          throw new Error("Foreign key violation: The user reference is invalid. Please try logging out and back in.");
        } else if (invError.code === '23505') {
          throw new Error("Duplicate entry: This investigation already exists.");
        } else if (invError.code === '42P01') {
          throw new Error("Table 'investigations' doesn't exist. Please run the database migrations.");
        } else {
          throw new Error(`Investigation creation failed: ${extractErrorMessage(invError)}`);
        }
      }

      if (!inv) {
        throw new Error("No data returned from investigation creation");
      }

      console.log("✅ [SUBMIT] Step 2: Investigation created:", inv.id);
      debugLog("Created investigation", inv);

      // Step 3: Create user_investigation
      console.log("🔍 [SUBMIT] Step 3: Creating user_investigation...");
      const userInvData = {
        user_id: user.id,
        investigation_id: inv.id,
        progress: 0,
        memories_since_start: 0,
        signals_collected: {},
        current_memory_ids: [],
      };
      
      debugLog("User investigation data", userInvData);

      const { data: userInv, error: startError } = await supabase
        .from("user_investigations")
        .insert(userInvData)
        .select()
        .single();

      if (startError) {
        console.error("❌ [SUBMIT] User investigation insert error:", startError);
        debugLog("User investigation error details", startError);
        
        // If user_investigation fails, try to clean up the investigation
        console.log("🧹 [SUBMIT] Cleaning up investigation due to user_investigation failure...");
        await supabase
          .from("investigations")
          .delete()
          .eq("id", inv.id);
        
        throw new Error(`User investigation creation failed: ${extractErrorMessage(startError)}`);
      }

      console.log("✅ [SUBMIT] Step 3: User investigation created:", userInv.id);
      debugLog("Created user investigation", userInv);

      console.log("🎉 [SUBMIT] Investigation creation complete!");
      setDebugInfo("✅ Investigation created successfully!");
      
      // Success! Redirect to investigations page
      setTimeout(() => {
        router.push("/investigations");
      }, 500);
      
    } catch (error: any) {
      console.error("=== 🔥 FULL ERROR DETAILS ===");
      console.error("Error name:", error?.name);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error details:", error?.details);
      console.error("Error hint:", error?.hint);
      console.error("Stack trace:", error?.stack);
      
      // Try to get more info from the error object
      if (error && typeof error === 'object') {
        debugLog("Complete error object", error);
      }
      console.error("===========================");
      
      const errorMessage = extractErrorMessage(error);
      setDebugInfo(`❌ Error: ${errorMessage}`);
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Debug component to show in UI
  const DebugInfo = () => {
    if (!debugInfo) return null;
    return (
      <div className={`mt-4 p-3 rounded-xl text-sm ${
        debugInfo.startsWith('✅') 
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
          : debugInfo.startsWith('❌')
          ? 'bg-rose-50 border border-rose-200 text-rose-700'
          : 'bg-blue-50 border border-blue-200 text-blue-700'
      }`}>
        <div className="flex items-start gap-2">
          <Bug className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{debugInfo}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24 md:pb-6">
      <Header />
      
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-secondary rounded-full transition-all duration-200 hover:scale-110"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">Create Investigation</h1>
        <span className="text-xs text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full ml-auto">
          Custom
        </span>
      </div>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Title <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g., What Drives My Creativity?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Question <span className="text-rose-500">*</span>
            </label>
            <Textarea
              placeholder="e.g., What patterns in my life make me feel most creative and inspired?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[80px] text-base resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Description <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              placeholder="What would you like to discover about yourself?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] text-base resize-none"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={generateSuggestions}
              disabled={loadingSuggestions}
              className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
            >
              {loadingSuggestions ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating suggestions...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4" />
                  Get AI suggestions for your investigation
                </>
              )}
            </button>

            {suggestionError && (
              <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-700">{suggestionError}</p>
              </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Suggested questions from your journal:</p>
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="block w-full text-left text-sm p-3 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !title || !question}
            className="w-full h-12 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Create Investigation
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You can only have one active investigation at a time.
          </p>

          {/* Debug Info Display */}
          <DebugInfo />
        </form>
      </div>
    </div>
  );
}