"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, MapPin, Check, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/ui/Header";

export default function InvestigationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [active, setActive] = useState<any>(null);
  const [available, setAvailable] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);

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
    const { data: all } = await supabase.from("investigations").select("*").eq("is_active", true);
    const { data: userInv } = await supabase
      .from("user_investigations")
      .select(`
        id,
        investigation_id,
        progress,
        completed_at,
        signals_collected,
        investigation:investigations(*)
      `)
      .eq("user_id", userId);

    if (userInv) {
      // Only mark as completed if progress >= 0.95 AND completed_at is set
      const active = userInv.filter(inv => !inv.completed_at && (inv.progress || 0) < 0.95);
      const completed = userInv.filter(inv => inv.completed_at || (inv.progress || 0) >= 0.95);
      
      setActive(active.length > 0 ? active[0] : null);
      setCompleted(completed);
      const startedIds = userInv.map(inv => inv.investigation_id);
      setAvailable(all?.filter(inv => !startedIds.includes(inv.id)) || []);
    } else {
      setAvailable(all || []);
    }
  };

  const startInvestigation = async (invId: string) => {
    if (!user) return;
    await supabase.from("user_investigations").insert({
      user_id: user.id,
      investigation_id: invId,
      progress: 0,
      signals_collected: {},
    });
    await fetchData(user.id);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="pb-24 md:pb-6">
      <Header />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="h-6 w-6 text-primary" /> Investigations</h1>
        <span className="text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">{active ? "Active" : "Start a journey"}</span>
      </div>

      {active && (
        <div className="bg-white rounded-xl p-4 border shadow-sm mb-4 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full"><MapPin className="h-5 w-5 text-primary" /></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{active.investigation?.title}</p>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{Math.round((active.progress || 0) * 100)}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{active.investigation?.question}</p>
            </div>
          </div>
          <div className="mt-3 w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.min((active.progress || 0) * 100, 100)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Signals: {active.signals_collected?.total_memories || 0} memories</span>
            <span>Keep writing to progress</span>
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Available Journeys</h2>
          {available.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => startInvestigation(inv.id)}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/50 rounded-full"><Compass className="h-5 w-5 text-muted-foreground" /></div>
                <div className="flex-1"><p className="text-sm font-medium">{inv.title}</p><p className="text-xs text-muted-foreground">{inv.description}</p></div>
                <button className="text-xs text-primary font-medium hover:underline">Start →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-4 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Completed Journeys</h2>
          {completed.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full"><Check className="h-5 w-5 text-green-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{inv.investigation?.title}</p>
                  <p className="text-xs text-muted-foreground">Completed • {Math.round((inv.progress || 0) * 100)}% complete</p>
                </div>
                <button className="text-xs text-primary font-medium hover:underline">View Report →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!active && available.length === 0 && completed.length === 0 && (
        <div className="text-center py-12"><Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium">No investigations yet</h3><p className="text-sm text-muted-foreground mt-1">Check back later.</p></div>
      )}
    </div>
  );
}
