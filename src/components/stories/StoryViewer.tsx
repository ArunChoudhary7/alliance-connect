import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { 
  X, ChevronLeft, ChevronRight, Eye, Trash2, MoreVertical, 
  Heart, Send, Share2, Volume2, VolumeX,
  Pause, Play, Users
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Story {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  background_color: string | null;
  expires_at: string;
  created_at: string;
  view_count: number;
  duration?: number;
}

interface StoryViewer {
  id: string;
  viewer_id: string;
  viewed_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface UserWithStories {
  userId: string;
  username: string;
  avatarUrl: string | null;
  stories: Story[];
}

interface StoryViewerProps {
  users: UserWithStories[];
  initialUserIndex: number;
  onClose: () => void;
  onRefresh: () => void;
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '🔥'];

export function StoryViewer({ users, initialUserIndex, onClose, onRefresh }: StoryViewerProps) {
  const { user } = useAuth();
  const [userIndex, setUserIndex] = useState(() => {
    if (users.length === 0) return 0;
    return Math.min(Math.max(initialUserIndex, 0), users.length - 1);
  });
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const [liked, setLiked] = useState(false);
  const [realtimeViewCount, setRealtimeViewCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentUser = users[userIndex];
  const currentStory = currentUser?.stories[storyIndex];
  const isOwnStory = currentStory?.user_id === user?.id;

  const STORY_DURATION = ((currentStory?.duration || 5) * 1000);

  useEffect(() => {
    if (users.length === 0) { onClose(); return; }
    setUserIndex((idx) => Math.min(Math.max(idx, 0), users.length - 1));
  }, [users.length, onClose]);

  useEffect(() => {
    if (users.length === 0) return;
    const clamped = Math.min(Math.max(initialUserIndex, 0), users.length - 1);
    setUserIndex(clamped);
    setStoryIndex(0);
    setProgress(0);
  }, [initialUserIndex, users.length]);

  useEffect(() => {
    const storyCount = currentUser?.stories?.length ?? 0;
    if (storyCount === 0) return;
    setStoryIndex((idx) => Math.min(Math.max(idx, 0), storyCount - 1));
  }, [currentUser?.userId, currentUser?.stories?.length]);

  useEffect(() => {
    if (isOwnStory && currentStory) {
      setRealtimeViewCount(currentStory.view_count || 0);
      fetchViewers();
      const channel = supabase
        .channel(`story_views:${currentStory.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'story_views', filter: `story_id=eq.${currentStory.id}` }, () => {
            fetchViewers();
            setRealtimeViewCount(prev => prev + 1);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [currentStory?.id, isOwnStory]);

  const fetchViewers = async () => {
    if (!currentStory) return;
    const { data, error } = await supabase.from('story_views').select(`id, viewer_id, viewed_at`).eq('story_id', currentStory.id).order('viewed_at', { ascending: false });
    if (!error && data) {
      if (data.length > 0) setRealtimeViewCount(data.length);
      const viewerIds = data.map(v => v.viewer_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', viewerIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setViewers(data.map(v => ({ ...v, profile: profileMap.get(v.viewer_id) })));
    }
  };

  useEffect(() => {
    if (currentStory && user && currentStory.user_id !== user.id) {
      const timer = setTimeout(() => {
        supabase.from('story_views').insert({ story_id: currentStory.id, viewer_id: user.id }).then(({ error }) => { if (error && error.code !== '23505') console.error("View error", error); });
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [currentStory?.id, user]);

  const handleDeleteStory = async () => {
    if (!currentStory || !user) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('stories').delete().eq('id', currentStory.id).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Moment deleted');
      const currentStoryCount = currentUser?.stories?.length ?? 0;
      if (currentStoryCount <= 1) {
        if (users.length <= 1) onClose(); else goToNextUser();
      } else {
        if (storyIndex > 0) setStoryIndex(prev => prev - 1);
        setProgress(0);
      }
      onRefresh();
    } catch (error: any) { toast.error(error.message || 'Failed to delete'); } 
    finally { setIsDeleting(false); setShowDeleteDialog(false); }
  };

  const goToNextUser = useCallback(() => {
    if (userIndex < users.length - 1) { setUserIndex(prev => prev + 1); setStoryIndex(0); setProgress(0); } else { onClose(); }
  }, [userIndex, users.length, onClose]);

  const goToNextStory = useCallback(() => {
    const cu = users[userIndex];
    if (!cu || (cu.stories?.length ?? 0) === 0) { onClose(); return; }
    if (storyIndex < (cu.stories.length - 1)) { setStoryIndex(prev => prev + 1); setProgress(0); } else { goToNextUser(); }
  }, [users, userIndex, storyIndex, goToNextUser, onClose]);

  const goToPrevStory = useCallback(() => {
    if (storyIndex > 0) { setStoryIndex(prev => prev - 1); setProgress(0); } else if (userIndex > 0) {
      const prevUser = users[userIndex - 1];
      if (!prevUser) { setUserIndex(0); setStoryIndex(0); setProgress(0); return; }
      setUserIndex(prev => prev - 1);
      setStoryIndex(Math.max(0, (prevUser.stories?.length ?? 0) - 1));
      setProgress(0);
    }
  }, [storyIndex, userIndex, users]);

  useEffect(() => {
    if (isPaused || !currentUser || !currentStory) return;
    const interval = setInterval(() => {
      setProgress(prev => { if (prev >= 100) { goToNextStory(); return 0; } return prev + (100 / (STORY_DURATION / 100)); });
    }, 100);
    return () => clearInterval(interval);
  }, [isPaused, goToNextStory, currentUser?.userId, currentStory?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNextStory();
      if (e.key === 'ArrowLeft') goToPrevStory();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); setIsPaused(p => !p); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextStory, goToPrevStory, onClose]);

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) goToPrevStory(); else if (info.offset.x < -threshold) goToNextStory(); else if (info.offset.y > threshold * 2) onClose();
  };

  const sendMessage = async (messageContent: string, isReaction = false) => {
    if (!currentStory || !user || !currentUser) return;
    try {
      const { data: existingConvo } = await supabase.from('conversations').select('id').or(`and(participant_1.eq.${user.id},participant_2.eq.${currentStory.user_id}),and(participant_1.eq.${currentStory.user_id},participant_2.eq.${user.id})`).single();
      let conversationId = existingConvo?.id;
      if (!conversationId) {
        const { data: newConvo } = await supabase.from('conversations').insert({ participant_1: user.id, participant_2: currentStory.user_id }).select('id').single();
        conversationId = newConvo?.id;
      }
      if (conversationId) {
        await supabase.from('direct_messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
          message_type: isReaction ? 'reaction' : 'story_reply',
          media_url: currentStory.media_url || null, // Ensure this sends null if no media
        });
        await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
        toast.success(isReaction ? `Sent ${messageContent}` : 'Reply sent');
      }
    } catch (error) { console.error(error); toast.error('Failed to send message'); }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    await sendMessage(replyText, false);
    setReplyText('');
    setIsPaused(false);
  };

  const handleReaction = async (emoji: string) => {
    await sendMessage(emoji, true);
    setShowReactions(false);
  };

  const handleDoubleTap = () => { setLiked(true); handleReaction('❤️'); setTimeout(() => setLiked(false), 1000); };

  if (!currentUser || !currentStory) return null;

  const content = (
    <motion.div ref={containerRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black flex items-center justify-center" style={{ zIndex: 99999 }}>
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {isOwnStory && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"><MoreVertical className="h-5 w-5" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border z-[100000]"><DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete Moment</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        )}
        <button onClick={onClose} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"><X className="h-5 w-5" /></button>
      </div>

      <button onClick={() => setIsPaused(p => !p)} className="absolute top-4 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">{isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
      <button onClick={goToPrevStory} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"><ChevronLeft className="h-6 w-6" /></button>
      <button onClick={goToNextStory} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"><ChevronRight className="h-6 w-6" /></button>

      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd} onDoubleClick={handleDoubleTap} onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} className="relative w-full max-w-md h-full max-h-[90vh] mx-auto touch-pan-y">
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
          {currentUser.stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"><motion.div className="h-full bg-white" initial={{ width: idx < storyIndex ? '100%' : '0%' }} animate={{ width: idx < storyIndex ? '100%' : idx === storyIndex ? `${progress}%` : '0%' }} transition={{ duration: 0.1 }} /></div>
          ))}
        </div>

        <div className="absolute top-8 left-3 right-3 flex items-center gap-3 z-20">
          <Avatar className="h-10 w-10 ring-2 ring-white/50"><AvatarImage src={currentUser.avatarUrl || undefined} /><AvatarFallback className="bg-primary text-primary-foreground">{currentUser.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0"><p className="text-white font-semibold text-sm truncate">{currentUser.username}</p><p className="text-white/60 text-xs">{formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}</p></div>
          {currentStory.media_type === 'video' && <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-black/30 text-white">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>}
        </div>

        <motion.div key={currentStory.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full rounded-xl overflow-hidden" style={{ backgroundColor: currentStory.media_url ? 'black' : (currentStory.background_color || '#6366f1') }}>
          {currentStory.media_url ? (currentStory.media_type === 'video' ? <video ref={videoRef} src={currentStory.media_url} className="w-full h-full object-contain" autoPlay muted={isMuted} loop playsInline /> : <img src={currentStory.media_url} alt="Story" className="w-full h-full object-contain" />) : <div className="w-full h-full flex items-center justify-center p-8"><p className="text-white text-2xl md:text-3xl font-bold text-center leading-relaxed">{currentStory.content}</p></div>}
          <AnimatePresence>{liked && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 flex items-center justify-center pointer-events-none"><Heart className="w-24 h-24 text-red-500 fill-red-500" /></motion.div>}</AnimatePresence>
        </motion.div>

        <div className="absolute bottom-4 left-3 right-3 z-20">
          {isOwnStory ? (
            <button onClick={() => { setShowViewers(true); setIsPaused(true); }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors mx-auto"><Users className="h-4 w-4" /><span className="text-sm">{Math.max(viewers.length, realtimeViewCount)} viewers</span></button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input 
                  value={replyText} 
                  onChange={(e) => setReplyText(e.target.value)} 
                  placeholder={`Reply to ${currentUser.username}...`} 
                  className="bg-black/50 border-white/20 text-white placeholder:text-white/50 pr-20 rounded-full" 
                  onFocus={() => setIsPaused(true)} 
                  onBlur={() => setIsPaused(false)} 
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }} 
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setShowReactions(!showReactions); setIsPaused(true); }} className="p-1 text-white/70 hover:text-white"><Heart className="h-5 w-5" /></button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={handleSendReply} disabled={!replyText.trim()} className="p-1 text-white/70 hover:text-white disabled:opacity-50"><Send className="h-5 w-5" /></button>
                </div>
              </div>
              <AnimatePresence>
                {showReactions && <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 10 }} className="absolute bottom-14 left-0 right-0 flex justify-center gap-4 bg-black/80 rounded-2xl px-4 py-3 mx-4">{REACTIONS.map((emoji) => <button key={emoji} onMouseDown={(e) => e.preventDefault()} onClick={() => handleReaction(emoji)} className="text-3xl hover:scale-125 transition-transform">{emoji}</button>)}</motion.div>}
              </AnimatePresence>
              <button className="p-2 rounded-full bg-black/50 text-white"><Share2 className="h-5 w-5" /></button>
            </div>
          )}
        </div>

        <button onClick={goToPrevStory} className="absolute left-0 top-20 bottom-20 w-1/3 z-10" />
        <button onClick={goToNextStory} className="absolute right-0 top-20 bottom-20 w-1/3 z-10" />
      </motion.div>

      <Sheet open={showViewers} onOpenChange={(open) => { setShowViewers(open); if (!open) setIsPaused(false); }}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl border-t border-border">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Viewers ({Math.max(viewers.length, realtimeViewCount)})</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(60vh-100px)]">
            {viewers.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Eye className="h-12 w-12 mb-2 opacity-20" /><p>No viewers yet</p></div> : viewers.map((viewer) => (
              <div key={viewer.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                <Avatar className="h-10 w-10"><AvatarImage src={viewer.profile?.avatar_url || undefined} /><AvatarFallback className="bg-primary/20">{viewer.profile?.username?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback></Avatar>
                <div className="flex-1"><p className="font-medium text-sm">{viewer.profile?.username || 'Unknown'}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}</p></div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-background border border-border z-[100001]">
          <AlertDialogHeader><AlertDialogTitle>Delete Moment</AlertDialogTitle><AlertDialogDescription>Are you sure?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteStory} disabled={isDeleting} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );

  return createPortal(content, document.body);
}