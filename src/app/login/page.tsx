"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-0 paper-card shadow-2xl overflow-hidden relative">
          {/* Decorative road pattern at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center p-3 bg-primary-gradient rounded-2xl mb-4 shadow-lg"
              >
                <BookOpen className="h-8 w-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Messyman</h1>
              <p className="text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" /> Begin your journey of self-discovery.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-secondary/50 rounded-xl">
                <span className="block font-medium">AI</span>
                <span className="text-muted-foreground">Reflections</span>
              </div>
              <div className="p-2 bg-secondary/50 rounded-xl">
                <span className="block font-medium">Journal</span>
                <span className="text-muted-foreground">Daily</span>
              </div>
              <div className="p-2 bg-secondary/50 rounded-xl">
                <span className="block font-medium">Growth</span>
                <span className="text-muted-foreground">Self</span>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-11 gap-2 bg-primary-gradient shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </motion.div>

            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
