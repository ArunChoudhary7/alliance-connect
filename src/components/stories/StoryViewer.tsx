import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Trash2, Heart, Eye, ChevronRight, Send, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StoryViewerProps {
  users: any[];
  initialUserIndex: number;
  onClose: () => void;
  onRefresh: () => void;
}

export function StoryViewer({ users, initialUserIndex, onClose, onRefresh }: StoryViewerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const currentUser = users[userIndex];
  const currentStory = currentUser?.stories[storyIndex];
  
  if (!currentUser || !currentStory) return null;

  const isOwnStory = currentStory?.user_id === user?.id;
  const isBeam = !!(currentStory?.is_beam && currentStory?.post);
  const post = currentStory?.post;
  const storyMedia = isBeam ? (post?.images?.[0] || post?.video_url) : currentStory?.media_url;
  const isVideo = currentStory?.media_type === 'video' || (isBeam && post?.video_url);

  const handleNext = useCallback(() => {
    if (storyIndex < currentUser.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      setProgress(0);
    } else if (userIndex < users.length - 1) {
      setUserIndex(prev => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIndex, userIndex, users.length, currentUser.stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setProgress(0);
    } else if (userIndex > 0) {
      const prevIdx = userIndex - 1;
      setUserIndex(prevIdx);
      setStoryIndex(users[prevIdx].stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, userIndex, users]);

  useEffect(() => {
    if (!user || !currentStory) return;
    setLiked(false);
    supabase.from('story_likes').select('id').eq('story_id', currentStory.id).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [userIndex, storyIndex, user, currentStory]);

  useEffect(() => {
    if (isPaused || !currentStory) return;
    const duration = isVideo ? (videoDuration ? videoDuration * 1000 : 15000) : 5000;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { handleNext(); return 0; }
        return prev + (100 / (duration / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPaused, currentStory, videoDuration, isVideo, handleNext]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !user || isSendingReply) return;
    setIsSendingReply(true);
    
    try {
      const { data: convs, error: fetchError } = await supabase.from('conversations').select('*');
      if (fetchError) throw fetchError;

      const conv = convs?.find(c => {
        const values = Object.values(c);
        return values.includes(user.id) && values.includes(currentStory.user_id);
      });

      if (!conv) {
        toast.error("Start a normal chat with this user first!");
        setIsSendingReply(false);
        return;
      }

      const { error: insertError } = await supabase.from('direct_messages').insert({
        conversation_id: conv.id,
        sender_id: user.id,
        content: `Replied to your story: ${replyText}`,
        media_url: storyMedia || null,
        message_type: isVideo ? 'video' : 'image' 
      });

      if (insertError) throw insertError;

      await supabase.from('conversations').update({
        last_message: `Story Reply: ${replyText}`,
        last_message_at: new Date().toISOString()
      }).eq('id', conv.id);

      toast.success("Reply sent with thumbnail!");
      setReplyText('');
      setIsPaused(false);
    } catch (e: any) {
      console.error("DM ERROR:", e);
      toast.error("Failed to send reply. Please check your connection.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleLike = async () => {
    if (!user || !currentStory) return;
    const newStatus = !liked;
    setLiked(newStatus);
    if (newStatus) {
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
      await supabase.from('story_likes').upsert({ user_id: user.id, story_id: currentStory.id });
    } else {
      await supabase.from('story_likes').delete().eq('user_id', user.id).eq('story_id', currentStory.id);
    }
  };

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black z-[99999] flex items-center justify-center backdrop-blur-md">
      <div className="relative w-full md:max-w-[420px] h-full md:h-[88vh] bg-black md:rounded-[32px] overflow-hidden border border-white/10 shadow-2xl" onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}>
        
        {/* NAV TAPS - Split 30/70 */}
        <div className="absolute inset-0 z-30 flex">
           <div className="w-[30%] h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
           <div className="w-[70%] h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
        </div>

        {/* PROGRESS BARS */}
        <div className="absolute top-10 inset-x-0 px-4 flex gap-1.5 z-[60] pointer-events-none">
          {currentUser.stories.map((_: any, i: number) => (
            <div key={i} className="flex-1 h-[2px] bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white shadow-[0_0_8px_white]" style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* HEADER AREA */}
        <div className="absolute top-0 inset-x-0 p-4 pt-14 z-[60] flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto cursor-pointer" onClick={() => { onClose(); navigate(`/profile/${currentUser.username}`); }}>
            <Avatar className="h-9 w-9 border border-white/20"><AvatarImage src={currentUser.avatarUrl} /><AvatarFallback>{currentUser.username[0]}</AvatarFallback></Avatar>
            <span className="text-white font-bold text-sm drop-shadow-md">{currentUser.username}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 text-white pointer-events-auto"><X /></button>
        </div>

        {/* MEDIA DISPLAY (Z-20 Container) */}
        <div className="w-full h-full flex items-center justify-center bg-zinc-950 relative z-20">
          <div className={cn("relative flex items-center justify-center transition-all duration-500 overflow-hidden", isBeam ? "w-[85%] h-[60%] rounded-[28px] border border-white/10" : "w-full h-full")}>
            {isVideo ? <video ref={videoRef} src={storyMedia} autoPlay muted playsInline loop className="w-full h-full object-cover" onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)} /> 
                     : <img src={storyMedia} className="w-full h-full object-cover" />}
          </div>
        </div>

        {/* 🔥 FIX: VISIT POST BUTTON MOVED OUTSIDE THE Z-20 CONTAINER 🔥 */}
        {isBeam && (
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); navigate(`/post/${currentStory.post_id}`); }}
            className="absolute bottom-36 left-1/2 -translate-x-1/2 bg-white text-black px-8 py-3.5 rounded-full font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all z-[100] flex items-center gap-2 pointer-events-auto cursor-pointer"
          >
            Visit Post <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* FOOTER AREA */}
        <div className="absolute bottom-0 inset-x-0 p-5 pb-10 bg-gradient-to-t from-black/90 to-transparent z-[60] flex items-center gap-4">
          {!isOwnStory && (
            <div className="flex items-center gap-4 w-full pointer-events-auto">
              <Input 
                value={replyText} 
                onChange={(e) => setReplyText(e.target.value)} 
                placeholder={`Reply...`} 
                className="flex-1 bg-white/10 border-none text-white rounded-full h-12 px-6"
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              />
              <button onClick={handleSendReply} className="text-purple-500" disabled={isSendingReply || !replyText.trim()}>
                {isSendingReply ? <Loader2 className="animate-spin" /> : <Send className="w-6 h-6" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className={cn("transition-transform active:scale-75", liked ? "text-purple-500" : "text-white")}>
                <Heart className={cn("w-7 h-7", liked ? "fill-current" : "")} />
              </button>
            </div>
          )}
        </div>

        {/* HEART ANIMATION */}
        <AnimatePresence>
          {showHeartAnim && (
            <motion.div initial={{ opacity: 0, scale: 0.5, y: 0 }} animate={{ opacity: 1, scale: 2.5, y: -100 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]">
              <Heart className="w-20 h-20 fill-purple-500 text-purple-500 drop-shadow-[0_0_20px_purple]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>,
    document.body
  );
}