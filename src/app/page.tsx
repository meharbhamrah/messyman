"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Clock, Compass, Sparkles, Footprints, Share2, TrendingUp, Eye, PenLine, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { checkAndGenerateDailyContent } from "@/app/actions/daily";
import { Header } from "@/components/ui/Header";

const discoveryMeta: Record<string, { icon: any, color: string, label: string }> = {
  time: { icon: Clock, color: "text-blue-500", label: "Time Pattern" },
  habit: { icon: TrendingUp, color: "text-purple-500", label: "Habit" },
  contrast: { icon: Compass, color: "text-orange-500", label: "Shift" },
  relationship: { icon: BookOpen, color: "text-green-500", label: "Relationship" },
  milestone: { icon: Sparkles, color: "text-amber-500", label: "Milestone" },
  correlation: { icon: TrendingUp, color: "text-indigo-500", label: "Correlation" },
  emotion: { icon: Sparkles, color: "text-rose-500", label: "Emotion" },
};

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayDiscovery, setTodayDiscovery] = useState<any>(null);
  const [todayPrompt, setTodayPrompt] = useState<any>(null);
  const [activeInvestigation, setActiveInvestigation] = useState<any>(null);
  const [completedInvestigations, setCompletedInvestigations] = useState<any[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [insightCount, setInsightCount] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasBeenRevealed, setHasBeenRevealed] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await checkAndGenerateDailyContent(user.id);
      await fetchData(user.id);
      setLoading(false);
    };
    load();

    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (userId: string) => {
    // Get today's discovery
    const { data: discovery } = await supabase
      .from("insights")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "daily")
      .order("created_at", { ascending: false })
      .limit(1);
    if (discovery && discovery.length > 0) {
      setTodayDiscovery(discovery[0]);
      const seen = localStorage.getItem(`discovery_seen_${discovery[0].id}`);
      if (seen === 'true') {
        setIsRevealed(true);
        setHasBeenRevealed(true);
      }
    }

    // Get total insight count
    const { count } = await supabase
      .from("insights")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "daily");
    setInsightCount(count || 0);

    // Get today's prompt
    const { data: prompt } = await supabase
      .from("journal_prompts")
      .select("*")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1);
    if (prompt && prompt.length > 0) setTodayPrompt(prompt[0]);

    // Get investigations
    const { data: inv } = await supabase
      .from("user_investigations")
      .select(`
        id,
        progress,
        memories_since_start,
        completed_at,
        signals_collected,
        investigation:investigations(id, title, question)
      `)
      .eq("user_id", userId)
      .order("completed_at", { ascending: false });

    if (inv && inv.length > 0) {
      const completed = inv.filter(i => i.completed_at !== null);
      const active = inv.find(i => i.completed_at === null);
      
      setCompletedInvestigations(completed);
      setActiveInvestigation(active || null);
    } else {
      setActiveInvestigation(null);
      setCompletedInvestigations([]);
    }

    const { count: memCount } = await supabase
      .from("memories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    setMemoryCount(memCount || 0);
  };

  const handleReveal = () => {
    if (isRevealing || isRevealed) return;
    setIsRevealing(true);
    setTimeout(() => {
      setIsRevealed(true);
      setHasBeenRevealed(true);
      setIsRevealing(false);
      if (todayDiscovery) {
        localStorage.setItem(`discovery_seen_${todayDiscovery.id}`, 'true');
      }
    }, 700);
  };

  const handleShare = (insightText: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Messyman Discovery',
        text: insightText,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(insightText);
      alert('Copied to clipboard!');
    }
  };

  const handleDiscoveryClick = () => {
    router.push("/insights");
  };

  const handleCompletedInvestigationClick = (investigationId: string) => {
    router.push(`/investigations/${investigationId}/report`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const structured = todayDiscovery?.evidence?.structured || null;
  const discoveryType = todayDiscovery?.discovery_type || structured?.type || 'insight';
  const meta = discoveryMeta[discoveryType] || { icon: Sparkles, color: "text-primary", label: "Discovery" };
  const IconComponent = meta.icon;

  // Check if the most recent completed investigation has a revelation
  const latestCompleted = completedInvestigations[0];
  const hasRevelationReady = latestCompleted?.investigation?.id;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <Header />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {firstName}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-xs bg-secondary/60 px-2 py-0.5 rounded-full">{currentTime}</span>
          </p>
        </div>
        <div className="p-2 bg-primary/10 rounded-full">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div 
          className="bg-white rounded-xl p-4 text-center shadow-sm border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          onClick={() => router.push("/timeline")}
        >
          <p className="text-2xl font-bold">{memoryCount}</p>
          <p className="text-xs text-muted-foreground">Memories</p>
        </div>
        <div 
          className="bg-white rounded-xl p-4 text-center shadow-sm border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30"
          onClick={handleDiscoveryClick}
        >
          <p className="text-2xl font-bold">{insightCount}</p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            Discoveries
            <span className="text-[10px] text-primary/60">→</span>
          </p>
        </div>
        <div 
          className="bg-white rounded-xl p-4 text-center shadow-sm border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          onClick={() => router.push("/investigations")}
        >
          <p className="text-2xl font-bold">{activeInvestigation || completedInvestigations.length > 0 ? completedInvestigations.length + 1 : "0"}</p>
          <p className="text-xs text-muted-foreground">Journeys</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => router.push("/memory/new")} className="flex flex-col items-center gap-2 p-4 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors border border-primary/10">
          <Plus className="h-6 w-6 text-primary" /><span className="text-xs font-medium">New Memory</span>
        </button>
        <button onClick={() => router.push("/prompt")} className="flex flex-col items-center gap-2 p-4 bg-secondary/50 rounded-xl hover:bg-secondary/70 transition-colors border">
          <Sparkles className="h-6 w-6 text-muted-foreground" /><span className="text-xs font-medium">Journal Prompt</span>
        </button>
        <button onClick={() => router.push("/timeline")} className="flex flex-col items-center gap-2 p-4 bg-secondary/50 rounded-xl hover:bg-secondary/70 transition-colors border">
          <Clock className="h-6 w-6 text-muted-foreground" /><span className="text-xs font-medium">Timeline</span>
        </button>
      </div>

      {/* Completed Investigation Card - Revelation Ready */}
      {hasRevelationReady && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          onClick={() => handleCompletedInvestigationClick(latestCompleted.investigation.id)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Revelation Ready</p>
              <p className="text-xs text-amber-700/70">
                {latestCompleted.investigation?.title}
              </p>
            </div>
            <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
              View Report →
            </span>
          </div>
        </motion.div>
      )}

      {/* Active Investigation */}
      {activeInvestigation && (
        <div 
          className="bg-white rounded-xl p-4 border shadow-sm border-primary/20 relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          onClick={() => router.push("/investigations")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full"><Compass className="h-5 w-5 text-primary" /></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Current Investigation</p>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{Math.round((activeInvestigation.progress || 0) * 100)}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{activeInvestigation.investigation?.title || "What makes me happy?"}</p>
            </div>
          </div>
          <div className="mt-3 w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min((activeInvestigation.progress || 0) * 100, 100)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Footprints className="h-3 w-3" />{activeInvestigation.memories_since_start || 0} memories in this journey</span>
            <span>{(activeInvestigation.progress || 0) >= 0.95 ? "Almost there!" : "Keep writing to progress"}</span>
          </div>
        </div>
      )}

      {/* Discovery Card */}
      {todayDiscovery && structured ? (
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="covered"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="relative cursor-pointer group"
              onClick={handleReveal}
            >
              <div className="bg-gradient-to-br from-primary/5 via-white to-accent/5 rounded-2xl border border-primary/20 shadow-sm p-8 min-h-[140px] flex flex-col items-start justify-center relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{ skewX: '-20deg' }}
                />
                <p className="text-xl font-medium text-foreground">You have a new discovery</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Tap to reveal</p>
                <motion.div
                  animate={{ x: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex justify-start mt-3"
                >
                  <Eye className="h-5 w-5 text-primary/60" />
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.5,
                type: "spring",
                stiffness: 350,
                damping: 30
              }}
              onClick={handleDiscoveryClick}
              className="bg-gradient-to-br from-primary/5 via-white to-accent/5 rounded-2xl p-6 border border-primary/20 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="absolute inset-0 pointer-events-none"
              >
                {[...Array(12)].map((_, i) => {
                  const angle = (i / 12) * Math.PI * 2;
                  const distance = 60 + Math.random() * 40;
                  return (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 bg-primary/30 rounded-full"
                      initial={{
                        x: '50%',
                        y: '50%',
                        scale: 0,
                        opacity: 0,
                      }}
                      animate={{
                        x: `calc(50% + ${Math.cos(angle) * distance}px)`,
                        y: `calc(50% + ${Math.sin(angle) * distance}px)`,
                        scale: 0.5 + Math.random() * 1.5,
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 0.8 + Math.random() * 0.4,
                        delay: Math.random() * 0.3,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}
              </motion.div>

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <motion.div 
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    <div className={`p-2 rounded-full ${meta.color} bg-primary/10`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{meta.label}</span>
                  </motion.div>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(todayDiscovery.insight_text);
                    }}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Share discovery"
                  >
                    <Share2 className="h-4 w-4" />
                  </motion.button>
                </div>
                
                {structured.title && (
                  <motion.h2
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="text-xl font-bold text-foreground mb-1"
                  >
                    {structured.title}
                  </motion.h2>
                )}
                
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="text-base text-foreground/90 leading-relaxed"
                >
                  {todayDiscovery.insight_text}
                </motion.p>
                
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"
                >
                  {structured.evidence && (
                    <span className="bg-secondary/50 px-2 py-0.5 rounded-full">{structured.evidence}</span>
                  )}
                  {structured.stat && (
                    <span className="bg-primary/10 px-2 py-0.5 rounded-full text-primary">{structured.stat}</span>
                  )}
                  <span className="text-xs text-primary/60 flex items-center gap-1">
                    View all →
                  </span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : todayDiscovery && !structured ? (
        <div 
          onClick={handleDiscoveryClick}
          className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/20 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-primary/80 uppercase tracking-wider">Today's Discovery</p>
              <p className="text-sm font-medium mt-1">{todayDiscovery.insight_text}</p>
              <p className="text-xs text-primary/60 mt-1">View all →</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-secondary/30 rounded-xl p-6 text-center border border-dashed border-secondary">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Write more memories to unlock discoveries</p>
        </div>
      )}

      {/* JOURNAL PROMPT CARD */}
      {todayPrompt ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden cursor-pointer"
          onClick={() => router.push("/prompt")}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <PenLine className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today's Prompt</span>
            </div>
            
            <p className="text-base text-foreground/90 leading-relaxed">
              {todayPrompt.prompt_text}
            </p>
            
            <div className="mt-4 flex items-center gap-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/prompt");
                }}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                Write your reflection
                <span className="text-xs">→</span>
              </button>
              <span className="text-xs text-muted-foreground">
                {new Date(todayPrompt.generated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-secondary/30 rounded-xl p-6 text-center border border-dashed border-secondary">
          <PenLine className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No prompt yet</p>
        </div>
      )}
    </div>
  );
}
