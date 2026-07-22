"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Plus, Clock, Compass, Quote, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Plus, label: "New", href: "/memory/new" },
    { icon: Quote, label: "Prompt", href: "/prompt" },
    { icon: Compass, label: "Explore", href: "/investigations" },
    { icon: TrendingUp, label: "Trends", href: "/trends" },
    { icon: Sparkles, label: "Insights", href: "/insights" },
  ];

  if (pathname === "/login" || pathname === "/auth/callback") {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border/50 shadow-soft">
      <nav className="flex items-center justify-around px-2 py-2 max-w-7xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 relative",
                isActive
                  ? "text-primary bg-primary/10 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:scale-105"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-200",
                isActive && "scale-110"
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
