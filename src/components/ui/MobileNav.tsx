"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Plus, Clock, Compass, Quote, Sparkles, TrendingUp } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Plus, label: "New", href: "/memory/new" },
  { icon: Quote, label: "Prompt", href: "/prompt" },
  { icon: Compass, label: "Explore", href: "/investigations" },
  { icon: TrendingUp, label: "Trends", href: "/trends" },
  { icon: Sparkles, label: "Insights", href: "/insights" },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show on auth pages
  if (pathname === "/login" || pathname === "/auth/callback") {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[9999]">
      <div className="flex items-center justify-around h-14 max-w-xl mx-auto">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href;
          return (
            <button
              key={label}
              onClick={() => router.push(href)}
              className={`
                flex flex-col items-center justify-center flex-1 h-full
                transition-colors duration-100
                ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'scale-105' : ''}`} />
              <span className="text-[10px] font-medium mt-0.5">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
