"use client";

export function RevelationCrown() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
      <path d="M15 75 L20 25 L40 45 L50 20 L60 45 L80 25 L85 75 L15 75Z" fill="url(#crownGrad)" stroke="#b87c5e" strokeWidth="2"/>
      <circle cx="35" cy="55" r="6" fill="#d4a373"/>
      <circle cx="50" cy="55" r="6" fill="#d4a373"/>
      <circle cx="65" cy="55" r="6" fill="#d4a373"/>
      <rect x="30" y="75" width="40" height="8" rx="2" fill="#b87c5e" opacity="0.3"/>
      <defs>
        <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a373"/>
          <stop offset="100%" stopColor="#b87c5e"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
