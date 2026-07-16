"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, MapPin, Music, Image, Footprints } from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDate, getMoodEmoji } from "@/lib/utils";

interface Memory {
  id: string;
  text: string | null;
  mood: string | null;
  location: string | null;
  photo_url: string | null;
  song_title: string | null;
  song_artist: string | null;
  created_at: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }
};

export default function TimelinePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchMemories = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setMemories(data || []);
      setLoading(false);
    };
    fetchMemories();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <Header />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Footprints className="h-5 w-5 text-primary" />
          Timeline
        </h1>
        <span className="text-sm text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full">
          {memories.length} steps
        </span>
      </div>

      {memories.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-soft rounded-2xl">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No steps yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Start your journey today.</p>
          <Button onClick={() => router.push("/memory/new")} className="mt-4">
            Take First Step
          </Button>
        </Card>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {memories.map((memory, idx) => (
            <motion.div key={memory.id} variants={item}>
              <Card
                className="cursor-pointer hover:shadow-hover transition-all border-0 shadow-soft rounded-2xl relative overflow-hidden"
                onClick={() => router.push(`/memory/${memory.id}`)}
              >
                {/* Small road line on the left */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-l-2xl">
                  <div className="w-1 h-1/2 bg-primary/40 rounded-full animate-pulse" />
                </div>
                <CardContent className="p-4 flex items-start gap-3 pl-5">
                  <span className="text-2xl">{getMoodEmoji(memory.mood)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{formatDate(memory.created_at)}</span>
                      {(memory.location || memory.song_title || memory.photo_url) && (
                        <span className="flex gap-1">
                          {memory.location && <MapPin className="h-3 w-3" />}
                          {memory.song_title && <Music className="h-3 w-3" />}
                          {memory.photo_url && <Image className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2">{memory.text || "No text"}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
