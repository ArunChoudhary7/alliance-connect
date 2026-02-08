import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface StoryRingProps {
  user?: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
  hasStory?: boolean;
  isSeen?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StoryRing({ 
  user, 
  hasStory = false, 
  isSeen = false, 
  onClick, 
  size = "md",
  className = ""
}: StoryRingProps) {
  
  // Size mappings
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-20 h-20"
  };

  const avatarSize = {
    sm: "w-[34px] h-[34px]", 
    md: "w-[58px] h-[58px]", 
    lg: "w-[74px] h-[74px]" 
  };

  // --- SAFETY CHECK WITH SKELETON ---
  // If user data is missing/loading, render a gray circle (Skeleton) instead of disappearing
  if (!user) {
    return (
      <div className={`relative flex flex-col items-center gap-1 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-secondary/50 animate-pulse border-2 border-transparent`} />
        {size !== "sm" && (
          <div className="h-3 w-12 bg-secondary/50 rounded animate-pulse" />
        )}
      </div>
    );
  }

  // Border Styles
  const ringClass = hasStory
    ? isSeen
      ? "bg-border" 
      : "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500" 
    : "";

  return (
    <div className={`relative flex flex-col items-center gap-1 ${className}`}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center p-[2px] ${ringClass} transition-all`}
      >
        <div className="bg-background rounded-full p-[2px] w-full h-full flex items-center justify-center">
          <Avatar className={`object-cover ${avatarSize[size]}`}>
            <AvatarImage src={user.avatar_url || ""} alt={user.username || ""} />
            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
          </Avatar>
        </div>
      </motion.button>
      
      {/* Username */}
      {size !== "sm" && (
        <span className="text-xs text-center truncate w-full max-w-[70px]">
          {user.username || "User"}
        </span>
      )}
    </div>
  );
}