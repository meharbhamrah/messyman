"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, MapPin, Check, Award, ChevronRight, Lock, Play, Sparkles, Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { generateGuidedInvestigations } from "@/app/actions/generate-guided";

interface Investigation {
  id: string;
  title: string;
  description: string;
  question: string;
  is_custom: boolean;
  created_by_user: string | null;
}

interface UserInvestigation {
  id: string;
  investigation_id: string;
  progress: number;
  completed_at: string | null;
  memories_since_start: number;
  signals_collected: any;
  investigation: Investigation;
  has_revelation?: boolean;
}

export default function InvestigationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [active, setActive] = useState<UserInvestigation | null>(null);
  const [completed, setCompleted] = useState<UserInvestigation[]>([]);
  const [guidedAvailable, setGuidedAvailable] = useState<Investigation[]>([]);
  const [customAvailable, setCustomAvailable] = useState<Investigation[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [allGuided, setAllGuided] = useState<Investigation[]>([]);

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
    console.log("🔍 [FETCH] Starting fetchData for user:", userId);

    // Fetch ALL guided investigations (generated + static) - use LET not CONST
    let { data: allGuidedData, error: guidedError } = await supabase
      .from("investigations")
      .select("*")
      .eq("is_active", true)
      .eq("is_custom", false)
      .order("created_at");
    
    console.log("📊 [FETCH] All guided investigations:", allGuidedData?.length || 0);
    if (guidedError) console.error("❌ [FETCH] Guided error:", guidedError);
    setAllGuided(allGuidedData || []);

    // Fetch custom investigations
    const { data: custom, error: customError } = await supabase
      .from("investigations")
      .select("*")
      .eq("is_active", true)
      .eq("is_custom", true)
      .eq("created_by_user", userId)
      .order("created_at", { ascending: false });
    console.log("📊 [FETCH] Custom investigations:", custom?.length || 0);
    if (customError) console.error("❌ [FETCH] Custom error:", customError);

    // Fetch user investigations
    let userInv: any = null;

    try {
      const { data, error } = await supabase
        .from("user_investigations")
        .select(`
          id,
          investigation_id,
          progress,
          completed_at,
          memories_since_start,
          signals_collected,
          investigation:investigations(*)
        `)
        .eq("user_id", userId)
        .order("started_at", { ascending: false });

      console.log("📊 [FETCH] User investigations:", data?.length || 0);
      
      if (error) {
        console.error("❌ [FETCH] UserInv error:", error);
        if (error.code === "42703") {
          console.warn("⚠️ [FETCH] 'started_at' column missing, trying order by 'id'...");
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("user_investigations")
            .select(`
              id,
              investigation_id,
              progress,
              completed_at,
              memories_since_start,
              signals_collected,
              investigation:investigations(*)
            `)
            .eq("user_id", userId)
            .order("id", { ascending: false });
          
          if (!fallbackError && fallbackData) {
            userInv = fallbackData;
            console.log("✅ [FETCH] Fallback succeeded:", userInv?.length || 0);
          } else {
            console.error("❌ [FETCH] Fallback also failed:", fallbackError);
            userInv = data || [];
          }
        } else {
          userInv = data || [];
        }
      } else {
        userInv = data || [];
      }
    } catch (err) {
      console.error("❌ [FETCH] Unexpected error:", err);
      userInv = [];
    }

    const completedWithRevelation = new Set();
    if (userInv && userInv.length > 0) {
      const completedIds = userInv.filter((inv: any) => inv.completed_at).map((inv: any) => inv.investigation_id);
      if (completedIds.length > 0) {
        const { data: insights } = await supabase
          .from("insights")
          .select("evidence")
          .eq("user_id", userId)
          .eq("type", "revelation");
        if (insights) {
          insights.forEach((insight: any) => {
            const invId = insight.evidence?.investigation_id;
            if (invId) completedWithRevelation.add(invId);
          });
        }
      }
    }

    if (userInv && userInv.length > 0) {
      const activeInv = userInv.find((inv: any) => !inv.completed_at);
      const completedInv = userInv.filter((inv: any) => inv.completed_at);
      
      setActive(activeInv || null);
      setCompleted(completedInv.map((inv: any) => ({
        ...inv,
        has_revelation: completedWithRevelation.has(inv.investigation_id)
      })));

      const startedIds = userInv.map((inv: any) => inv.investigation_id);
      console.log("🔍 [FETCH] Started investigation IDs:", startedIds);

      // ============================================================
      // Always show exactly 3 guided investigations
      // ============================================================
      let availableGuided = allGuidedData?.filter((inv: any) => !startedIds.includes(inv.id)) || [];
      console.log("🔍 [FETCH] Available guided (not started):", availableGuided.length);
      
      // If fewer than 3 available, generate new ones (but only if user has enough memories)
      if (availableGuided.length < 3 && !generating) {
        console.log("🔍 [FETCH] Less than 3 available, generating more...");
        setGenerating(true);
        try {
          const result = await generateGuidedInvestigations(userId, 3 - availableGuided.length);
          if (result.success) {
            console.log("✅ [FETCH] Generated new guided investigations");
            // Refetch guided data
            const { data: newGuided, error: newGuidedError } = await supabase
              .from("investigations")
              .select("*")
              .eq("is_active", true)
              .eq("is_custom", false)
              .order("created_at");
            
            if (!newGuidedError && newGuided) {
              allGuidedData = newGuided; // ✅ Now works because we used 'let'
              setAllGuided(newGuided);
              // Recalculate available
              availableGuided = newGuided.filter((inv: any) => !startedIds.includes(inv.id));
              console.log("🔍 [FETCH] After generation, available:", availableGuided.length);
            }
          } else {
            console.warn("⚠️ [FETCH] Generation failed or not enough memories:", result.error);
          }
        } catch (err) {
          console.error("❌ [FETCH] Generation error:", err);
        } finally {
          setGenerating(false);
        }
      }
      
      // Take up to 3 available guided investigations
      const displayGuided = availableGuided.slice(0, 3);
      console.log("🔍 [FETCH] Displaying guided:", displayGuided.length);
      
      setGuidedAvailable(displayGuided);
      
      const filteredCustom = custom?.filter((inv: any) => !startedIds.includes(inv.id)) || [];
      console.log("🔍 [FETCH] Filtered custom (available):", filteredCustom.length);
      
      setCustomAvailable(filteredCustom);
      
      if (activeInv) {
        console.log("✅ [FETCH] Active investigation found:", {
          id: activeInv.investigation_id,
          title: activeInv.investigation?.title,
          progress: activeInv.progress
        });
      } else {
        console.log("ℹ️ [FETCH] No active investigation");
      }
    } else {
      setActive(null);
      setCompleted([]);
      // Show first 3 guided investigations (or generate if none)
      let displayGuided = allGuidedData?.slice(0, 3) || [];
      if (displayGuided.length < 3 && !generating) {
        setGenerating(true);
        try {
          const result = await generateGuidedInvestigations(userId, 3);
          if (result.success) {
            const { data: newGuided, error: newGuidedError } = await supabase
              .from("investigations")
              .select("*")
              .eq("is_active", true)
              .eq("is_custom", false)
              .order("created_at");
            if (!newGuidedError && newGuided) {
              setAllGuided(newGuided);
              displayGuided = newGuided.slice(0, 3);
            }
          }
        } catch (err) {
          console.error("❌ [FETCH] Generation error:", err);
        } finally {
          setGenerating(false);
        }
      }
      setGuidedAvailable(displayGuided);
      setCustomAvailable(custom || []);
    }
    
    setDebugInfo(`Fetched at ${new Date().toLocaleTimeString()}`);
    console.log("✅ [FETCH] fetchData complete");
  };

  const startInvestigation = async (invId: string) => {
    if (!user) {
      console.error("❌ [START] No user");
      return;
    }
    
    console.log("🚀 [START] Starting investigation:", invId);
    console.log("🔑 [START] User ID:", user.id);
    
    try {
      // Check if there's already an active investigation
      const { data: existing } = await supabase
        .from("user_investigations")
        .select("id, investigation_id")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .limit(1);

      if (existing && existing.length > 0) {
        console.warn("⚠️ [START] User already has an active investigation:", existing[0]);
        alert("You already have an active investigation. Please complete it first.");
        return;
      }

      const insertData: any = {
        user_id: user.id,
        investigation_id: invId,
        progress: 0,
        memories_since_start: 0,
        signals_collected: {},
      };

      console.log("📝 [START] Insert data:", insertData);

      const { data, error } = await supabase
        .from("user_investigations")
        .insert(insertData)
        .select();

      if (error) {
        console.error("❌ [START] Insert error:", error);
        alert(`Failed to start: ${error.message}`);
        return;
      }

      console.log("✅ [START] Insert successful:", data);
      console.log("🔄 [START] Refetching data...");
      await fetchData(user.id);
      console.log("✅ [START] Refetch complete");
      
    } catch (err) {
      console.error("❌ [START] Unexpected error:", err);
      alert("Failed to start investigation. Please try again.");
    }
  };

  const deleteCustomInvestigation = async (invId: string) => {
    if (!user) return;
    
    const { data: userInv } = await supabase
      .from("user_investigations")
      .select("id, completed_at")
      .eq("investigation_id", invId)
      .eq("user_id", user.id)
      .limit(1);

    if (userInv && userInv.length > 0) {
      alert("Cannot delete: This investigation has been started. Please complete it first.");
      setShowDeleteConfirm(null);
      return;
    }

    const { error } = await supabase
      .from("investigations")
      .delete()
      .eq("id", invId)
      .eq("created_by_user", user.id);

    if (!error) {
      await fetchData(user.id);
    }
    setShowDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasActive = active !== null;
  console.log("🔍 [RENDER] hasActive:", hasActive, "active:", active?.investigation?.title);

  return (
    <div className="pb-24 md:pb-6">
      <Header />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          Investigations
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
            {completed.length} / {completed.length + (active ? 1 : 0) + guidedAvailable.length + customAvailable.length} completed
          </span>
          <Button
            size="sm"
            onClick={() => router.push("/investigations/new")}
            disabled={hasActive}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Custom
          </Button>
          <span className="text-xs text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full">
            {debugInfo}
          </span>
        </div>
      </div>

      {generating && (
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-sm text-blue-700 mb-4 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          Generating personalized investigations based on your life...
        </div>
      )}

      {hasActive && (
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-sm text-amber-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Complete your active investigation before starting a new one.
        </div>
      )}

      {active && (
        <div className="bg-white rounded-xl p-4 border shadow-sm border-primary/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-2">
                  {active.investigation.title}
                  {active.investigation.is_custom && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Custom</span>
                  )}
                </p>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {Math.round(active.progress * 100)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{active.investigation.question}</p>
              <div className="mt-2">
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${active.progress * 100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {active.memories_since_start || 0} relevant memories • {Math.round(active.progress * 100)}% complete
                </p>
              </div>
            </div>
            <button 
              onClick={() => router.push("/memory/new")}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {guidedAvailable.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Guided Investigations
            <span className="text-xs text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full ml-auto">
              {guidedAvailable.length} available
            </span>
          </h2>
          {guidedAvailable.map((inv) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-4 border border-dashed border-primary/30 hover:border-primary/60 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/5 rounded-full">
                  <Compass className="h-5 w-5 text-primary/60" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{inv.title}</p>
                  <p className="text-xs text-muted-foreground">{inv.question}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{inv.description}</p>
                </div>
                <button 
                  onClick={() => startInvestigation(inv.id)}
                  disabled={hasActive}
                  className="text-xs bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-3.5 w-3.5" />
                  {hasActive ? "Locked" : "Start"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {guidedAvailable.length === 0 && allGuided.length > 0 && (
        <div className="bg-secondary/30 rounded-xl p-6 text-center border border-dashed border-secondary">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">You've completed all guided investigations!</p>
          <p className="text-xs text-muted-foreground mt-1">Create a custom investigation to continue your journey</p>
          <Button 
            onClick={() => router.push("/investigations/new")}
            className="mt-4"
            variant="outline"
          >
            Create Custom Investigation
          </Button>
        </div>
      )}

      {customAvailable.length > 0 && (
        <div className="space-y-3 mt-4">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Your Custom Investigations
          </h2>
          {customAvailable.map((inv) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-4 border border-dashed border-purple-300/50 hover:border-purple-500 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-full">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{inv.title}</p>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Custom</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{inv.question}</p>
                  {inv.description && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{inv.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => startInvestigation(inv.id)}
                    disabled={hasActive}
                    className="text-xs bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {hasActive ? "Locked" : "Start"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(inv.id)}
                    className="p-2 text-muted-foreground hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                    title="Delete investigation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Investigation?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete this custom investigation. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => deleteCustomInvestigation(showDeleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {!active && guidedAvailable.length === 0 && customAvailable.length === 0 && completed.length === 0 && (
        <div className="text-center py-12">
          <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No investigations yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Start a guided investigation or create your own custom one.
          </p>
          <Button 
            onClick={() => router.push("/investigations/new")}
            className="mt-4 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Custom Investigation
          </Button>
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-4 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Completed</h2>
          {completed.map((inv) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`bg-white rounded-xl p-4 border transition-all duration-200 hover:shadow-md ${
                inv.has_revelation ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${inv.has_revelation ? 'bg-green-100' : 'bg-secondary/50'}`}>
                  {inv.has_revelation ? (
                    <Award className="h-5 w-5 text-green-600" />
                  ) : (
                    <Check className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{inv.investigation.title}</p>
                    {inv.investigation.is_custom && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Custom</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inv.has_revelation ? '✨ Revelation ready' : 'Completed'}
                  </p>
                </div>
                {inv.has_revelation ? (
                  <button 
                    onClick={() => router.push(`/investigations/${inv.investigation_id}/report`)}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    View Report
                    <ChevronRight className="h-3 w-3" />
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Done</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
