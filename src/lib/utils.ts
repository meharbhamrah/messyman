import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getMoodEmoji(mood: string | null) {
  const map: Record<string, string> = {
    happy: "😊",
    sad: "😢",
    excited: "🤩",
    calm: "😌",
    angry: "😤",
    anxious: "😰",
    grateful: "🙏",
    inspired: "✨",
    tired: "😴",
    peaceful: "🕊️",
  };
  return mood ? map[mood.toLowerCase()] || "📝" : "📝";
}
