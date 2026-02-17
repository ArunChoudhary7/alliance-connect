import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string | null) {
  if (!name) return "AU";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const FORBIDDEN_WORDS = [
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "pussy", "cunt",
  "nigga", "nigger", "faggot", "slut", "whore"
];

export function censorText(text: string): string {
  let censored = text;
  FORBIDDEN_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    censored = censored.replace(regex, "****");
  });
  return censored;
}

export function getAvatarUrl(avatarUrl: string | null | undefined, seed: string) {
  if (avatarUrl && avatarUrl.trim() !== '') return avatarUrl;
  // Use a cool, modern avatar style from DiceBear
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}