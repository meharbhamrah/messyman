"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Star, Clock, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Insight {
  id: string;
  insight_text: string;
  type: string;
  created_at: string;
  seen_at: string | null;
}

export default function InsightsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("insights")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setInsights(data || []);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Insights
        </h1>
        <span className="text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
          {insights.length} discoveries
        </span>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-12">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No insights yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Write more memories to unlock discoveries.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`bg-white rounded-xl p-4 border shadow-sm ${
                insight.type === "revelation" 
                  ? "border-amber-200 bg-gradient-to-br from-amber-50/50 to-white" 
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${
                  insight.type === "revelation" 
                    ? "bg-amber-100" 
                    : "bg-primary/10"
                }`}>
                  {insight.type === "revelation" ? (
                    <Award className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{insight.insight_text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(insight.created_at).toLocaleDateString()}
                    </span>
                    {insight.type === "revelation" && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Revelation
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
