import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
    fallbackClassName?: string;
}

// Curated palette of beautiful gradient pairs
const GRADIENT_PALETTES = [
    ["#f43f5e", "#fb923c"],   // Crimson → Orange
    ["#8b5cf6", "#06b6d4"],   // Violet → Cyan
    ["#10b981", "#06b6d4"],   // Emerald → Cyan
    ["#f97316", "#eab308"],   // Orange → Yellow
    ["#8b5cf6", "#ec4899"],   // Violet → Pink
    ["#06b6d4", "#3b82f6"],   // Cyan → Blue
    ["#f43f5e", "#8b5cf6"],   // Rose → Violet
    ["#10b981", "#3b82f6"],   // Green → Blue
    ["#f97316", "#ef4444"],   // Orange → Red
    ["#a855f7", "#06b6d4"],   // Purple → Cyan
    ["#eab308", "#f97316"],   // Yellow → Orange
    ["#ec4899", "#f43f5e"],   // Pink → Rose
];

/** Deterministically pick a gradient index from a string */
function getGradientIndex(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    return Math.abs(hash) % GRADIENT_PALETTES.length;
}

function getInitials(name: string | null | undefined): string {
    if (!name || name === "null" || name === "undefined" || name.trim() === "") return "AU";
    const initials = name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    return initials.slice(0, 2) || "AU";
}

/** Generates a beautiful inline SVG data URL for the avatar */
function generateGradientAvatar(name: string | null | undefined): string {
    const initials = getInitials(name);
    const seed = (name || "anonymous").toLowerCase().replace(/\s+/g, "");
    const idx = getGradientIndex(seed);
    const [c1, c2] = GRADIENT_PALETTES[idx];

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <!-- subtle noise-like pattern for texture -->
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" mode="overlay" result="blend"/>
      <feComposite in="blend" in2="SourceGraphic" operator="in"/>
    </filter>
  </defs>
  <!-- gradient background -->
  <rect width="100" height="100" fill="url(#g)"/>
  <!-- subtle texture overlay -->
  <rect width="100" height="100" fill="white" opacity="0.04" filter="url(#n)"/>
  <!-- gloss shine at top -->
  <ellipse cx="50" cy="30" rx="40" ry="25" fill="white" opacity="0.08"/>
  <!-- initials -->
  <text 
    x="50" y="57" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="${initials.length > 1 ? '36' : '42'}" 
    font-weight="900" 
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="middle"
    letter-spacing="-1"
    style="text-shadow:0 2px 8px rgba(0,0,0,0.3)"
  >${initials}</text>
</svg>`.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function UserAvatar({ src, name, className, fallbackClassName }: UserAvatarProps) {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    // The gradient avatar — always available, generated inline
    const gradientAvatar = generateGradientAvatar(name);

    // Clean the src — reject clearly invalid values
    const validSrc = src && src !== "null" && src !== "undefined" && src.trim() !== "" ? src.trim() : null;

    useEffect(() => {
        setFailed(false);
        setImgSrc(validSrc);
    }, [validSrc]);

    const displaySrc = (!failed && imgSrc) ? imgSrc : gradientAvatar;

    return (
        <div className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)}>
            <img
                src={displaySrc}
                alt={name || "User"}
                className="w-full h-full object-cover"
                onError={() => {
                    if (!failed) {
                        setFailed(true);
                        setImgSrc(gradientAvatar);
                    }
                }}
            />
        </div>
    );
}
