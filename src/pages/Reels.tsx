import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, VolumeX, Volume2, Pause, Play, ChevronUp, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Reel {
  id: string;
  user_id: string;
  content: string | null;
  video_url: string;
  aura_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function Reels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReels();
    if (user) fetchUserLikes();
  }, [user]);

  const fetchReels = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .not("video_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedReels = data.map(reel => ({
        ...reel,
        video_url: reel.video_url!,
        aura_count: reel.aura_count || 0,
        comments_count: reel.comments_count || 0,
        profiles: profileMap.get(reel.user_id) || null,
      }));

      setReels(enrichedReels);
    }
  };

  const fetchUserLikes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("auras")
      .select("post_id")
      .eq("user_id", user.id);

    if (data) {
      setLikedReels(new Set(data.map(a => a.post_id)));
    }
  };

  const handleScroll = useCallback((direction: "up" | "down") => {
    if (direction === "down" && currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (direction === "up" && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, reels.length]);

  useEffect(() => {
    // Play current video, pause others
    reels.forEach((reel, index) => {
      const video = videoRefs.current.get(reel.id);
      if (video) {
        if (index === currentIndex && !isPaused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, reels, isPaused]);

  const handleLike = async (reelId: string) => {
    if (!user) {
      toast.error("Please sign in to like");
      return;
    }

    const isLiked = likedReels.has(reelId);

    if (isLiked) {
      await supabase
        .from("auras")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", reelId);

      setLikedReels(prev => {
        const next = new Set(prev);
        next.delete(reelId);
        return next;
      });

      setReels(prev =>
        prev.map(r => (r.id === reelId ? { ...r, aura_count: r.aura_count - 1 } : r))
      );
    } else {
      await supabase
        .from("auras")
        .insert({ user_id: user.id, post_id: reelId });

      setLikedReels(prev => new Set([...prev, reelId]));

      setReels(prev =>
        prev.map(r => (r.id === reelId ? { ...r, aura_count: r.aura_count + 1 } : r))
      );
    }
  };

  const handleTouchStart = useRef<number>(0);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = handleTouchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      handleScroll(diff > 0 ? "down" : "up");
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "AU";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (reels.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg mb-4">No reels yet</p>
          <Button onClick={() => navigate("/create")} className="rounded-full">
            Create your first reel
          </Button>
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  return (
    <div
      ref={containerRef}
      className="h-screen bg-black overflow-hidden relative"
      onTouchStart={(e) => (handleTouchStart.current = e.touches[0].clientY)}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 text-white hover:bg-white/20 rounded-full"
      >
        ←
      </Button>

      {/* Navigation arrows */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleScroll("up")}
          disabled={currentIndex === 0}
          className="text-white hover:bg-white/20 rounded-full disabled:opacity-30"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleScroll("down")}
          disabled={currentIndex === reels.length - 1}
          className="text-white hover:bg-white/20 rounded-full disabled:opacity-30"
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      </div>

      {/* Reels container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentReel.id}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="h-full w-full relative"
        >
          {/* Video */}
          <video
            ref={(el) => {
              if (el) videoRefs.current.set(currentReel.id, el);
            }}
            src={currentReel.video_url}
            className="h-full w-full object-cover"
            loop
            playsInline
            muted={isMuted}
            onClick={() => setIsPaused(!isPaused)}
          />

          {/* Play/Pause overlay */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="p-4 rounded-full bg-black/50">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

          {/* Actions sidebar */}
          <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleLike(currentReel.id)}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                "p-3 rounded-full",
                likedReels.has(currentReel.id) ? "bg-accent/30" : "bg-white/20"
              )}>
                <Heart className={cn(
                  "h-7 w-7",
                  likedReels.has(currentReel.id) ? "text-accent fill-accent" : "text-white"
                )} />
              </div>
              <span className="text-white text-sm font-medium">{currentReel.aura_count}</span>
            </motion.button>

            <button className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-full bg-white/20">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <span className="text-white text-sm font-medium">{currentReel.comments_count}</span>
            </button>

            <button className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-full bg-white/20">
                <Share2 className="h-7 w-7 text-white" />
              </div>
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 rounded-full bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="h-7 w-7 text-white" />
              ) : (
                <Volume2 className="h-7 w-7 text-white" />
              )}
            </button>
          </div>

          {/* User info and caption */}
          <div className="absolute bottom-6 left-4 right-20">
            <Link to={`/profile/${currentReel.profiles?.username}`} className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 ring-2 ring-white/30">
                <AvatarImage src={currentReel.profiles?.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {getInitials(currentReel.profiles?.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-white font-semibold">
                {currentReel.profiles?.username || "user"}
              </span>
            </Link>

            {currentReel.content && (
              <p className="text-white text-sm line-clamp-2">
                {currentReel.content}
              </p>
            )}
          </div>

          {/* Progress indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
            {reels.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 rounded-full transition-all",
                  index === currentIndex ? "w-6 bg-white" : "w-2 bg-white/40"
                )}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
