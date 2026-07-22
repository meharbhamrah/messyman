"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Send, Loader2, Lightbulb, Plus, X, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { getInvestigationSuggestions } from "@/app/actions/suggestions";

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

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
    };
    getUser();
  }, []);

  const generateSuggestions = async () => {
    if (!user) return;
    setLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      console.log("📊 [UI] Calling server action for suggestions...");
      const result = await getInvestigationSuggestions(user.id);
      
      if (result.success && result.suggestions && result.suggestions.length > 0) {
        console.log("📊 [UI] Received", result.suggestions.length, "suggestions");
        setSuggestions(result.suggestions);
        setShowSuggestions(true);
      } else if (result.success) {
        setSuggestionError("No suggestions generated. Try writing more memories first.");
      } else {
        setSuggestionError(result.error || "Failed to generate suggestions. Please try again.");
      }
    } catch (error: any) {
      console.error("Error generating suggestions:", error);
      setSuggestionError(error.message || "Failed to generate suggestions. Please try again.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
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

    console.log('📊 [UI] Generated title:', title);
    console.log('📊 [UI] Full question:', suggestion);

    setTitle(title);
    setQuestion(suggestion);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !question) {
      alert("Please provide a title and question.");
      return;
    }

    setLoading(true);
    try {
      const { data: active } = await supabase
        .from("user_investigations")
        .select("id")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .limit(1);

      if (active && active.length > 0) {
        alert("You already have an active investigation. Please complete it first.");
        setLoading(false);
        return;
      }

      const { data: inv, error: invError } = await supabase
        .from("investigations")
        .insert({
          title: title,
          question: question,
          description: description || null,
          is_custom: true,
          created_by_user: user.id,
          custom_question: question,
          is_active: true,
        })
        .select()
        .single();

      if (invError) throw invError;

      const { error: startError } = await supabase
        .from("user_investigations")
        .insert({
          user_id: user.id,
          investigation_id: inv.id,
          progress: 0,
          memories_since_start: 0,
          signals_collected: {},
          current_memory_ids: [],
        });

      if (startError) throw startError;

      router.push("/investigations");
    } catch (error) {
      console.error("Error creating investigation:", error);
      alert("Failed to create investigation. Please try again.");
    } finally {
      setLoading(false);
    }
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
        </form>
      </div>
    </div>
  );
}
