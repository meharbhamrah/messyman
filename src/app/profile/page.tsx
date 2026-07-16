"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Mail, Calendar, BookOpen, TrendingUp, Footprints, MapPin } from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      const { count } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setMemoryCount(count || 0);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const joinDate = user?.created_at ? formatDate(user.created_at) : "Recently";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 pb-20 md:pb-0"
    >
      <Header />
      <Card className="border-0 shadow-soft rounded-2xl">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary-gradient flex items-center justify-center text-2xl font-bold text-white shadow-md">
            {user?.user_metadata?.full_name?.[0] || "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.user_metadata?.full_name || "User"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-soft rounded-2xl">
          <CardContent className="p-4 text-center">
            <Footprints className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{memoryCount}</p>
            <p className="text-xs text-muted-foreground">Steps taken</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft rounded-2xl">
          <CardContent className="p-4 text-center">
            <MapPin className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Journeys completed</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-soft rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-3 py-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Joined {joinDate}</span>
          </div>
          <div className="flex items-center gap-3 py-1">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 py-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>Last active: Today</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
