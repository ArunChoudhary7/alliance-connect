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

  // --- SKELETON RECOVERY ---
  // Restored the actual UI for when the user is undefined
  if (!user) {
    return (
      <div className={`relative flex flex-col items-center gap-1 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-secondary/50 animate-pulse`} />
        {size !== "sm" && (
          <div className="h-2 w-10 bg-secondary/30 rounded animate-pulse mt-1" />
        )}
      </div>
    );
  }

  // UPDATED: More vibrant Instagram-accurate gradient for Unseen stories
  const ringClass = hasStory
    ? isSeen
      ? "p-[1px] border-2 border-muted-foreground/30" // DULL / VIEWED
      : "p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" // VIBRANT / UNVIEWED
    : "p-[1px] border border-transparent";

  return (
    <div className={`relative flex flex-col items-center gap-1 ${className}`}>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center ${ringClass} transition-all duration-500`}
      >
        <div className="bg-background rounded-full p-[2px] w-full h-full flex items-center justify-center">
          <Avatar className={`object-cover ${avatarSize[size]}`}>
            <AvatarImage src={user.avatar_url || ""} alt={user.username || ""} />
            <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </motion.button>
      
      {size !== "sm" && (
        <span className={`text-[10px] font-bold text-center truncate w-full max-w-[70px] ${isSeen ? 'text-muted-foreground/60' : 'text-foreground'}`}>
          {user.username || "User"}
        </span>
      )}
    </div>
  );
}