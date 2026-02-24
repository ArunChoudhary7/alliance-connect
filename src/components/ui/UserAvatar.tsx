import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
    fallbackClassName?: string;
}

// Curated palette of beautiful gradient pairs
const GRADIENTS = [
    ["#f43f5e", "#fb923c"],
    ["#8b5cf6", "#06b6d4"],
    ["#10b981", "#06b6d4"],
    ["#f97316", "#eab308"],
    ["#8b5cf6", "#ec4899"],
    ["#06b6d4", "#3b82f6"],
    ["#f43f5e", "#8b5cf6"],
    ["#10b981", "#3b82f6"],
    ["#f97316", "#ef4444"],
    ["#a855f7", "#06b6d4"],
    ["#eab308", "#f97316"],
    ["#ec4899", "#f43f5e"],
];

function hashStr(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function getInitials(name: string | null | undefined): string {
    if (!name || name === "null" || name === "undefined" || name.trim() === "") return "AU";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials = parts.map(p => p[0]).join("").toUpperCase();
    return initials.slice(0, 2) || "AU";
}

export function UserAvatar({ src, name, className, fallbackClassName }: UserAvatarProps) {
    // Clean the src — reject garbage values
    const validSrc = useMemo(() => {
        if (!src || src === "null" || src === "undefined" || src.trim() === "") return null;
        return src.trim();
    }, [src]);

    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);

    // Reset on src change
    useEffect(() => {
        setImgLoaded(false);
        setImgError(false);
    }, [validSrc]);

    const initials = useMemo(() => getInitials(name), [name]);
    const gradientIdx = useMemo(() => hashStr((name || "anon").toLowerCase()), [name]);
    const [c1, c2] = GRADIENTS[gradientIdx % GRADIENTS.length];

    const showFallback = !validSrc || imgError;

    return (
        <div className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)}>
            {/* Always render the gradient fallback behind the image */}
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    background: `linear-gradient(135deg, ${c1}, ${c2})`,
                }}
            >
                <span
                    className="font-black text-white select-none leading-none"
                    style={{
                        fontSize: "40%",
                        letterSpacing: "-0.02em",
                        textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}
                >
                    {initials}
                </span>
            </div>

            {/* Real image on top — if it loads, it covers the fallback */}
            {validSrc && !imgError && (
                <img
                    src={validSrc}
                    alt={name || "User"}
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                        imgLoaded ? "opacity-100" : "opacity-0"
                    )}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgError(true)}
                    loading="lazy"
                />
            )}
        </div>
    );
}
