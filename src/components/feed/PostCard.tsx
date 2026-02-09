import { useState, useEffect, useRef } from "react";
import { Heart, Trash2, MoreVertical, MessageCircle, Slash, AlertTriangle, Share2, Play, Pause, Volume2, VolumeX, Sparkles, Timer } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { getInitials, cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { toast } from "sonner";
import { PostComments } from "@/components/feed/PostComments";
import { motion } from "framer-motion";

function CustomVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  return (
    <div className="relative group w-full bg-black flex items-center justify-center cursor-pointer" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-[500px] object-contain"
        playsInline
        muted={isMuted}
        loop
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
          <div className="p-4 rounded-full bg-black/50 backdrop-blur-sm text-white">
            <Play className="w-8 h-8 fill-white" />
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
        <button onClick={togglePlay} className="text-white hover:text-white/80">
          {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
        </button>
        <div className="flex-1 mx-3 h-1 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={toggleMute} className="text-white hover:text-white/80">
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

export function PostCard({ post, onDeleted }: any) {
  const { user } = useAuth();
  const [hasAura, setHasAura] = useState(false);
  const [auraCount, setAuraCount] = useState(post.aura_count || 0);
  const [commentsEnabled, setCommentsEnabled] = useState(post.comments_enabled ?? true);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  // STEALTH TIMER LOGIC
  useEffect(() => {
    if (!post.expires_at || !post.is_stealth) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(post.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("EXPIRED");
        if (onDeleted) onDeleted();
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    };

    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(interval);
  }, [post.expires_at, post.is_stealth]);

  useEffect(() => {
    if (!user) return;
    supabase.from("auras").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle().then(({ data }) => setHasAura(!!data));
    const channel = supabase.channel(`post_auras:${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auras', filter: `post_id=eq.${post.id}` }, () => {
          supabase.from("posts").select("aura_count").eq("id", post.id).single().then(({ data }) => { if (data) setAuraCount(data.aura_count); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, post.id]);

  const handleAura = async () => {
    if (!user) return;
    const newStatus = !hasAura;
    setHasAura(newStatus);
    setAuraCount(prev => newStatus ? prev + 1 : prev - 1);
    try {
      if (newStatus) await supabase.from("auras").insert({ post_id: post.id, user_id: user.id });
      else await supabase.from("auras").delete().eq("post_id", post.id).eq("user_id", user.id);
    } catch (e) {
      setHasAura(!newStatus); setAuraCount(prev => newStatus ? prev - 1 : prev + 1); toast.error("Failed");
    }
  };

  const confirmDelete = async () => {
    try {
      setIsDeleted(true);
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      toast.success("Deleted");
      if (onDeleted) onDeleted(); 
    } catch (e) { setIsDeleted(false); toast.error("Failed"); } finally { setShowDeleteDialog(false); }
  };

  const toggleComments = async () => {
    setCommentsEnabled(!commentsEnabled);
    await supabase.from("posts").update({ comments_enabled: !commentsEnabled }).eq("id", post.id);
    toast.success(!commentsEnabled ? "Enabled" : "Disabled");
  };

  const author = post.profiles || { username: 'user', full_name: 'AU User', avatar_url: '', total_aura: 0 };
  const isElite = (author.total_aura || 0) >= 500;
  const isStealth = post.is_stealth;

  if (isDeleted) return null;

  return (
    <>
      <motion.div
        initial={isElite ? { y: 20, opacity: 0 } : { opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={cn(
          "super-card mb-8 transition-all duration-500",
          isElite && "ghost-mode-active",
          isStealth && "stealth-glitch"
        )}
      >
        {isElite && !isStealth && (
          <div className="absolute top-4 right-12 z-20">
            <Sparkles className="w-4 h-4 text-white/40 animate-pulse" />
          </div>
        )}

        {isStealth && (
          <div className="absolute top-4 right-6 flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full z-20">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]" />
            <span className="text-[10px] font-black text-red-500 tracking-tighter uppercase tabular-nums">
              BURN IN: {timeLeft}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <Link to={`/profile/${author.username}`} className="flex items-center gap-3 group">
            <div className={`p-0.5 rounded-full bg-gradient-to-tr from-accent to-primary ${isElite ? 'shadow-[0_0_15px_rgba(var(--primary),0.5)]' : ''}`}>
              <Avatar className="h-10 w-10 border-2 border-black">
                <AvatarImage src={author.avatar_url} />
                <AvatarFallback>{getInitials(author.full_name)}</AvatarFallback>
              </Avatar>
            </div>
            <div>
              <p className="font-bold text-sm text-white group-hover:underline decoration-white/30 underline-offset-4">
                {author.full_name}
              </p>
              <p className="text-[10px] text-white/40 font-medium tracking-wide uppercase">
                @{author.username} • {isStealth ? "CLASSIFIED" : `${formatDistanceToNow(new Date(post.created_at))} ago`}
              </p>
            </div>
          </Link>
          {user?.id === post.user_id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10 rounded-xl">
                <DropdownMenuItem onClick={toggleComments}>
                  <Slash className="h-4 w-4 mr-2" /> {commentsEnabled ? "Disable Comments" : "Enable Comments"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-500 focus:text-red-500">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-4">
          {post.content && (
            <p className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap px-1",
              isElite && "font-medium",
              isStealth ? "text-red-100 font-mono italic" : "text-white/90"
            )}>
              {post.content}
            </p>
          )}
          
          {(post.is_thread && post.thread_items) || post.video_url || post.images?.[0] ? (
            <div className={cn(
              "rounded-[2rem] overflow-hidden border border-white/5 bg-black/50 shadow-inner relative group",
              isStealth && "grayscale opacity-80 contrast-125"
            )}>
                {post.is_thread ? (
                    <Carousel className="w-full">
                        <CarouselContent>
                          {post.thread_items.map((item: any, idx: number) => (
                            <CarouselItem key={idx}>
                              {item.type === 'video' ? <CustomVideoPlayer src={item.url} /> : <img src={item.url} className="w-full object-cover max-h-[500px]" />}
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        {post.thread_items.length > 1 && <><CarouselPrevious className="left-2" /><CarouselNext className="right-2" /></>}
                    </Carousel>
                ) : post.video_url ? (
                    <CustomVideoPlayer src={post.video_url} />
                ) : (
                    <img src={post.images[0]} className="w-full object-cover max-h-[500px]" loading="lazy" />
                )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "rounded-full h-10 px-4 gap-2 hover:bg-white/10",
                hasAura ? 'text-pink-500' : 'text-white/60'
              )} 
              onClick={handleAura}
            >
              <Heart className={cn("h-5 w-5", hasAura && "fill-current")} />
              <span className="text-xs font-bold">{auraCount}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full h-10 px-4 gap-2 hover:bg-white/10 text-white/60" 
              disabled={!commentsEnabled} 
              onClick={() => setShowComments(true)}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs font-bold">{post.comments_count || 0}</span>
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white/60">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-card border-white/10 bg-black/95 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex gap-2">
              <AlertTriangle /> Delete Post?
            </AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PostComments postId={post.id} open={showComments} onOpenChange={setShowComments} postOwnerId={post.user_id} />
    </>
  );
}