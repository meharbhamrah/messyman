"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Sparkles, Loader2, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";

interface TrendData {
  date: string;
  sentiment: number;
  emotions: string[];
  topics: string[];
  keywords: string[];
}

export default function TrendsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [activeTab, setActiveTab] = useState<'mood' | 'work'>('mood');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [moodInsight, setMoodInsight] = useState<any>(null);
  const [workInsight, setWorkInsight] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await fetchData(user.id);
      setLoading(false);
    };
    load();
  }, []);

  const fetchData = async (userId: string) => {
    const { data: memories } = await supabase
      .from("memories")
      .select("ai_sentiment, ai_emotions, ai_topics, ai_keywords, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (memories) {
      const processed = memories.map((m: any) => ({
        date: new Date(m.created_at).toISOString().split('T')[0],
        sentiment: m.ai_sentiment || 0,
        emotions: m.ai_emotions || [],
        topics: m.ai_topics || [],
        keywords: m.ai_keywords || [],
      }));
      setTrendData(processed);
    }
  };

  useEffect(() => {
    if (trendData.length > 0 && user) {
      loadInsights();
    }
  }, [trendData, activeTab, period, user]);

  const loadInsights = async () => {
    if (!user) return;
    setInsightsLoading(true);
    setInsightError(null);
    try {
      const moodRes = await fetch('/api/trends/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, period, type: 'mood' })
      });
      const moodData = await moodRes.json();
      if (moodData.success) setMoodInsight(moodData.data);

      const workRes = await fetch('/api/trends/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, period, type: 'work' })
      });
      const workData = await workRes.json();
      if (workData.success) setWorkInsight(workData.data);
    } catch (error) {
      console.error("Error loading insights:", error);
      setInsightError("Could not generate insights");
    } finally {
      setInsightsLoading(false);
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
      <Header />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trends</h1>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === p ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { id: 'mood', label: 'Mood' },
          { id: 'work', label: 'Work & Life' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                isActive ? 'bg-primary text-white shadow-md' : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'mood' && (
        <MoodTab 
          data={trendData} 
          period={period} 
          insight={moodInsight} 
          isLoading={insightsLoading} 
          error={insightError}
        />
      )}
      {activeTab === 'work' && (
        <WorkTab 
          data={trendData} 
          period={period} 
          insight={workInsight} 
          isLoading={insightsLoading} 
          error={insightError}
        />
      )}
    </div>
  );
}

// ============================================================
// MOOD TAB
// ============================================================
function MoodTab({ data, period, insight, isLoading, error }: any) {
  const chartData = getPeriodData(data, period);
  const hasData = chartData.length > 0;

  const avgSentiment = chartData.reduce((s: number, d: any) => s + d.sentiment, 0) / (chartData.length || 1);
  
  let moodLabel = 'Neutral';
  let moodColor = 'text-amber-600';
  let bgColor = 'bg-amber-50';
  let borderColor = 'border-amber-200';
  let moodEmoji = '😐';
  if (avgSentiment > 0.3) {
    moodLabel = 'Good';
    moodColor = 'text-green-600';
    bgColor = 'bg-green-50';
    borderColor = 'border-green-200';
    moodEmoji = '😊';
  } else if (avgSentiment > 0) {
    moodLabel = 'Positive';
    moodColor = 'text-teal-600';
    bgColor = 'bg-teal-50';
    borderColor = 'border-teal-200';
    moodEmoji = '🙂';
  } else if (avgSentiment < -0.3) {
    moodLabel = 'Low';
    moodColor = 'text-rose-600';
    bgColor = 'bg-rose-50';
    borderColor = 'border-rose-200';
    moodEmoji = '😟';
  } else if (avgSentiment < 0) {
    moodLabel = 'Down';
    moodColor = 'text-orange-600';
    bgColor = 'bg-orange-50';
    borderColor = 'border-orange-200';
    moodEmoji = '😔';
  }

  const allEmotions = chartData.flatMap(d => d.emotions);
  const emotionCounts: Record<string, number> = {};
  allEmotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });
  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const maxVal = 0.8;
  const minVal = -0.8;

  const insightText = insight?.description || insight || null;
  const needsMoreData = insight?.needs_more_data || false;

  return (
    <div className="space-y-4">
      <div className={`${bgColor} rounded-2xl p-6 border ${borderColor} shadow-sm`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Your overall mood</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{moodEmoji}</span>
              <span className={`text-3xl font-bold ${moodColor}`}>{moodLabel}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Based on {chartData.length} entries</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{period}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border shadow-sm">
        <h3 className="text-sm font-medium mb-3">Mood over time</h3>
        {hasData ? (
          <div className="h-20 flex items-end gap-0.5">
            {chartData.map((d: any, i: number) => {
              const height = ((d.sentiment - minVal) / (maxVal - minVal)) * 100;
              const clamped = Math.max(Math.min(height, 100), 5);
              const color = d.sentiment > 0.2 ? '#4ade80' : d.sentiment < -0.2 ? '#f87171' : '#fbbf24';
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div 
                    className="w-full max-w-[8px] rounded-t transition-all duration-500"
                    style={{ height: `${clamped}%`, backgroundColor: color }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-sm">Not enough data</p>
        )}
      </div>

      {topEmotions.length > 0 && (
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <h3 className="text-sm font-medium mb-2">Top feelings</h3>
          <div className="flex flex-wrap gap-2">
            {topEmotions.map((e: any) => (
              <span key={e.name} className="px-3 py-1 bg-secondary/50 rounded-full text-sm">
                {e.name} · {e.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-secondary/30 rounded-2xl p-5 border shadow-sm flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Finding patterns...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200 shadow-sm">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      ) : needsMoreData ? (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-sm">
          <div className="flex items-start gap-3">
            <PenLine className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Write more memories</p>
              <p className="text-sm text-amber-700 mt-1">{insightText}</p>
              <button 
                onClick={() => window.location.href = '/memory/new'}
                className="mt-3 text-sm text-amber-600 font-medium hover:underline"
              >
                Write a memory →
              </button>
            </div>
          </div>
        </div>
      ) : insightText ? (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-indigo-100 rounded-full">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Discovery</p>
              <p className="text-sm font-medium text-foreground mt-1 leading-relaxed">{insightText}</p>
              {insight?.evidence && !needsMoreData && (
                <p className="text-xs text-muted-foreground mt-1">{insight.evidence}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// WORK TAB
// ============================================================
function WorkTab({ data, period, insight, isLoading, error }: any) {
  const chartData = getPeriodData(data, period);

  const allTopics = chartData.flatMap(d => d.topics);
  const workTopics = ['work','job','career','boss','colleague','meeting','project','office'];
  const lifeTopics = ['family','friend','home','hobby','weekend','vacation','fun','love','peace'];
  let workCount = 0, lifeCount = 0;
  allTopics.forEach(t => {
    const lower = t.toLowerCase();
    if (workTopics.some(w => lower.includes(w))) workCount++;
    if (lifeTopics.some(l => lower.includes(l))) lifeCount++;
  });
  const total = workCount + lifeCount || 1;
  const workPct = Math.round((workCount / total) * 100);
  const lifePct = 100 - workPct;

  const purposeKeywords = ['meaning','purpose','goal','dream','aspire','why'];
  const purposeMentions = chartData.flatMap(d => d.keywords || [])
    .filter(k => purposeKeywords.some(p => k.toLowerCase().includes(p))).length;

  const insightText = insight?.description || insight || null;
  const needsMoreData = insight?.needs_more_data || false;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Your focus</p>
            <p className="text-3xl font-bold text-blue-600">{workPct}% Work · {lifePct}% Life</p>
            <p className="text-sm text-muted-foreground mt-1">Based on {chartData.length} entries</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border shadow-sm">
        <h3 className="text-sm font-medium mb-3">Balance</h3>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-600 font-medium">Work</span>
              <span>{workPct}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${workPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-600 font-medium">Life</span>
              <span>{lifePct}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${lifePct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {purposeMentions > 0 && (
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <p className="text-sm">Purpose mentioned <span className="font-semibold">{purposeMentions}</span> times</p>
        </div>
      )}

      {isLoading ? (
        <div className="bg-secondary/30 rounded-2xl p-5 border shadow-sm flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Finding patterns...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200 shadow-sm">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      ) : needsMoreData ? (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-sm">
          <div className="flex items-start gap-3">
            <PenLine className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Write more memories</p>
              <p className="text-sm text-amber-700 mt-1">{insightText}</p>
              <button 
                onClick={() => window.location.href = '/memory/new'}
                className="mt-3 text-sm text-amber-600 font-medium hover:underline"
              >
                Write a memory →
              </button>
            </div>
          </div>
        </div>
      ) : insightText ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-amber-100 rounded-full">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Discovery</p>
              <p className="text-sm font-medium text-foreground mt-1 leading-relaxed">{insightText}</p>
              {insight?.evidence && !needsMoreData && (
                <p className="text-xs text-muted-foreground mt-1">{insight.evidence}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function getPeriodData(data: TrendData[], period: string): TrendData[] {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return data.filter(d => new Date(d.date) >= cutoff);
}
