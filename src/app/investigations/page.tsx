"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, MapPin, Check, Award, ChevronRight, Lock, Play, Sparkles, Plus, Trash2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";

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
  const [user, setUser] = useState<any>(null);
  const [active, setActive] = useState<UserInvestigation | null>(null);
  const [completed, setCompleted] = useState<UserInvestigation[]>([]);
  const [guidedAvailable, setGuidedAvailable] = useState<Investigation[]>([]);
  const [customAvailable, setCustomAvailable] = useState<Investigation[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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
    const { data: guided } = await supabase
      .from("investigations")
      .select("*")
      .eq("is_active", true)
      .eq("is_custom", false)
      .order("created_at");

    const { data: custom } = await supabase
      .from("investigations")
      .select("*")
      .eq("is_active", true)
      .eq("is_custom", true)
      .eq("created_by_user", userId)
      .order("created_at", { ascending: false });

    const { data: userInv } = await supabase
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
      .order("created_at");

    const completedWithRevelation = new Set();
    if (userInv) {
      const completedIds = userInv.filter(inv => inv.completed_at).map(inv => inv.investigation_id);
      if (completedIds.length > 0) {
        const { data: insights } = await supabase
          .from("insights")
          .select("evidence")
          .eq("user_id", userId)
          .eq("type", "revelation");
        if (insights) {
          insights.forEach(insight => {
            const invId = insight.evidence?.investigation_id;
            if (invId) completedWithRevelation.add(invId);
          });
        }
      }
    }

    if (userInv) {
      const activeInv = userInv.find(inv => !inv.completed_at);
      const completedInv = userInv.filter(inv => inv.completed_at);
      
      setActive(activeInv || null);
      setCompleted(completedInv.map(inv => ({
        ...inv,
        has_revelation: completedWithRevelation.has(inv.investigation_id)
      })));

      const startedIds = userInv.map(inv => inv.investigation_id);
      setGuidedAvailable(guided?.filter(inv => !startedIds.includes(inv.id)) || []);
      setCustomAvailable(custom?.filter(inv => !startedIds.includes(inv.id)) || []);
    } else {
      setActive(null);
      setCompleted([]);
      setGuidedAvailable(guided || []);
      setCustomAvailable(custom || []);
    }
  };

  const startInvestigation = async (invId: string) => {
    if (!user) return;

    const { error } = await supabase.from("user_investigations").insert({
      user_id: user.id,
      investigation_id: invId,
      progress: 0,
      memories_since_start: 0,
      signals_collected: {},
      current_memory_ids: [],
    });

    if (!error) {
      await fetchData(user.id);
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
        </div>
      </div>

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
