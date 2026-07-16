"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Send, Quote, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PromptPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [response, setResponse] = useState("");
  const [prompt, setPrompt] = useState<string>("");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      await fetchPrompt(user.id);
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchPrompt = async (userId: string) => {
    // Get the most recent prompt that hasn't been responded to
    const { data } = await supabase
      .from("journal_prompts")
      .select("id, prompt_text, responded_at")
      .eq("user_id", userId)
      .is("responded_at", null)
      .order("generated_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setPrompt(data[0].prompt_text);
      setPromptId(data[0].id);
    } else {
      // Fallback: show the most recent prompt even if responded
      const { data: fallback } = await supabase
        .from("journal_prompts")
        .select("id, prompt_text")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false })
        .limit(1);
      if (fallback && fallback.length > 0) {
        setPrompt(fallback[0].prompt_text);
        setPromptId(fallback[0].id);
      } else {
        setPrompt("What made you smile today? Tell me about it.");
      }
    }
  };

  const handleSubmit = async () => {
    if (!response.trim()) {
      alert("Please write something before submitting.");
      return;
    }

    setSaving(true);
    try {
      if (promptId) {
        await supabase
          .from("journal_prompts")
          .update({
            response: response,
            responded_at: new Date().toISOString(),
          })
          .eq("id", promptId);
      }
      // If no promptId, save as a memory instead? We'll redirect to home.
      router.push("/");
    } catch (error) {
      console.error(error);
      alert("Failed to save response.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Quote className="h-5 w-5 text-primary" />
          Journal Prompt
        </h1>
      </div>

      {/* Prompt Card */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-6 border border-primary/20 mb-6">
        <div className="flex items-center gap-2 text-primary/80 mb-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Today's Prompt</span>
        </div>
        <p className="text-lg font-medium leading-relaxed">{prompt}</p>
      </div>

      {/* Response Area */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <textarea
          placeholder="Write your reflection here... Take your time."
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className="w-full min-h-[200px] text-base leading-relaxed border-0 resize-none focus:outline-none bg-transparent"
          maxLength={5000}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {response.length}/5000 characters
          </span>
          <button
            onClick={handleSubmit}
            disabled={saving || !response.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Reflection
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Your reflections help you grow and discover yourself.
      </p>
    </div>
  );
}
