import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string | null | undefined) {
  if (!name || name.trim() === '' || name === 'null' || name === 'undefined') return "AU";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 2) || "AU";
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
  // Handle literal "null" or "undefined" strings that sometimes come from DB/client quirks
  if (!avatarUrl || avatarUrl === 'null' || avatarUrl === 'undefined' || avatarUrl.trim() === '') {
    // Force a reliable seed if name is also garbage
    const cleanSeed = (!seed || seed === 'null' || seed === 'undefined' || seed.trim() === '')
      ? 'anonymous'
      : seed.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Use a cool, modern avatar style from DiceBear
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  }
  return avatarUrl;
}