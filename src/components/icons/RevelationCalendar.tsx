"use client";

export function RevelationCalendar() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
      <rect x="20" y="25" width="60" height="55" rx="4" stroke="#b87c5e" strokeWidth="2"/>
      <line x1="20" y1="40" x2="80" y2="40" stroke="#b87c5e" strokeWidth="1.5"/>
      <line x1="35" y1="15" x2="35" y2="30" stroke="#b87c5e" strokeWidth="2" strokeLinecap="round"/>
      <line x1="65" y1="15" x2="65" y2="30" stroke="#b87c5e" strokeWidth="2" strokeLinecap="round"/>
      <rect x="35" y="50" width="8" height="8" rx="2" fill="#d4a373" opacity="0.5"/>
      <rect x="50" y="50" width="8" height="8" rx="2" fill="#d4a373" opacity="0.7"/>
      <rect x="65" y="50" width="8" height="8" rx="2" fill="#d4a373"/>
    </svg>
  );
}
