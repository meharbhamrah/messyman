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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-200 z-[9999]">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full",
                "transition-colors duration-100",
                isActive
                  ? "text-[#b87c5e]"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive && "scale-105"
              )} />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
