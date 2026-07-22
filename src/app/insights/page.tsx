"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Award, Clock, Calendar, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";
import { formatDate } from "@/lib/utils";

interface Insight {
  id: string;
  insight_text: string;
  type: string;
  discovery_type: string;
  created_at: string;
  evidence: any;
}

// Map discovery type to icon and color
const discoveryMeta: Record<string, { icon: any, color: string, label: string }> = {
  time: { icon: Clock, color: "text-blue-500", label: "Time Pattern" },
  habit: { icon: Sparkles, color: "text-purple-500", label: "Habit" },
  contrast: { icon: Sparkles, color: "text-orange-500", label: "Shift" },
  relationship: { icon: Sparkles, color: "text-green-500", label: "Relationship" },
  milestone: { icon: Sparkles, color: "text-amber-500", label: "Milestone" },
  correlation: { icon: Sparkles, color: "text-indigo-500", label: "Correlation" },
  emotion: { icon: Sparkles, color: "text-rose-500", label: "Emotion" },
  memory: { icon: Sparkles, color: "text-teal-500", label: "Memory" },
  music: { icon: Sparkles, color: "text-purple-500", label: "Music Insight" },
  person: { icon: Sparkles, color: "text-green-500", label: "Person Insight" },
  stat: { icon: Sparkles, color: "text-indigo-500", label: "Stat" },
};

export default function InsightsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data } = await supabase
        .from("insights")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setInsights(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const dailyInsights = insights.filter(i => i.type === 'daily');
  const revelations = insights.filter(i => i.type === 'revelation');

  return (
    <div className="pb-24 md:pb-6">
      <Header />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-secondary rounded-full transition-all duration-200 hover:scale-110"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Insights
          </h1>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
          {dailyInsights.length} discoveries
        </span>
      </div>

      {dailyInsights.length === 0 && revelations.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No insights yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Write more memories to unlock discoveries.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Revelations first (most important) */}
          {revelations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Revelations
              </h2>
              {revelations.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-amber-100">
                      <Award className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">{insight.insight_text}</p>
                      <p className="text-xs text-amber-600/70 mt-1">
                        {formatDate(insight.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Daily insights */}
          {dailyInsights.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Daily Discoveries
              </h2>
              {dailyInsights.map((insight, index) => {
                const meta = discoveryMeta[insight.discovery_type] || { icon: Sparkles, color: "text-primary", label: "Discovery" };
                const IconComponent = meta.icon;
                const structured = insight.evidence?.structured || null;
                
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${meta.color} bg-primary/10`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        {structured?.title && (
                          <p className="text-sm font-medium text-foreground">{structured.title}</p>
                        )}
                        <p className="text-sm text-foreground/80 leading-relaxed mt-0.5">
                          {insight.insight_text}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(insight.created_at)}
                          </span>
                          {structured?.evidence && (
                            <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-full">
                              {structured.evidence}
                            </span>
                          )}
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
