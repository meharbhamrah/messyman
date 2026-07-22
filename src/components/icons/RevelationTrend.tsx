"use client";

export function RevelationTrend() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
      <line x1="10" y1="80" x2="90" y2="80" stroke="#b87c5e" strokeWidth="1.5" strokeLinecap="round"/>
      <polyline points="20,70 35,50 50,55 65,30 80,40" stroke="#d4a373" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="80" cy="40" r="4" fill="#d4a373"/>
    </svg>
  );
}
