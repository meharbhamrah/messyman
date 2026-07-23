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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 border-t border-primary/10 shadow-lg z-50 safe-bottom">
      <nav className="flex items-center justify-around px-1 py-1 max-w-7xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors duration-150 touch-manipulation",
                "min-h-[44px] min-w-[44px]", // Larger touch targets
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-none",
                isActive && "scale-105"
              )} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
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
