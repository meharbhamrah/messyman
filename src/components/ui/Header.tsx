"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, BookOpen, LogOut, Home, Plus, Quote, Sparkles, Compass, TrendingUp } from "lucide-react";
import { Button } from "./Button";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "New Memory", icon: Plus, href: "/memory/new" },
    { label: "Prompt", icon: Quote, href: "/prompt" },
    { label: "Explore", icon: Compass, href: "/investigations" },
    { label: "Trends", icon: TrendingUp, href: "/trends" },
    { label: "Insights", icon: Sparkles, href: "/insights" },
  ];

  return (
    <header className="relative z-20 w-full paper-card rounded-2xl px-4 sm:px-6 py-3 mb-8 shadow-soft backdrop-blur-md flex items-center justify-between transition-all duration-300 hover:shadow-hover">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-xl bg-primary-gradient text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg">
          <BookOpen className="h-5 w-5" />
        </div>
        <span className="font-semibold text-lg tracking-tight text-foreground">Messyman</span>
        <span className="hidden sm:inline-flex items-center gap-1 ml-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full transition-all duration-300 hover:bg-primary/20 hover:scale-105">
          Journey
        </span>
      </div>
      
      <div className="hidden md:flex items-center gap-1">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            onClick={() => router.push(item.href)}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/60 gap-1.5 transition-all duration-200 hover:scale-105"
          >
            <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            {item.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50/60 gap-1.5 transition-all duration-200 hover:scale-105"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-foreground hover:bg-secondary/60 transition-all duration-200 hover:scale-105"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-4 right-4 mt-2 md:hidden paper-card rounded-xl shadow-lg p-4 flex flex-col gap-2 z-50">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              className="justify-start text-foreground/70 hover:text-foreground hover:bg-secondary/60 transition-all duration-200 hover:scale-[1.02]"
              onClick={() => {
                router.push(item.href);
                setIsOpen(false);
              }}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          ))}
          <hr className="border-border/50 my-1" />
          <Button
            variant="ghost"
            className="justify-start text-rose-600 hover:bg-rose-50/60 transition-all duration-200 hover:scale-[1.02]"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      )}
    </header>
  );
}
