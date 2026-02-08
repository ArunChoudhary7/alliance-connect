import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, PanInfo } from "framer-motion";
import { 
  X, Eye, Trash2, MoreVertical, 
  Heart, Send, Volume2, VolumeX,
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

// --- Types ---
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

interface StoryViewerData {
  id: string;
  viewer_id: string;
  viewed_at: string;
  has_liked?: boolean;
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

export function StoryViewer({ users, initialUserIndex, onClose, onRefresh }: StoryViewerProps) {
  const { user } = useAuth();
  
  // --- State ---
  const [userIndex, setUserIndex] = useState(() => {
    if (users.length === 0) return 0;
    return Math.min(Math.max(initialUserIndex, 0), users.length - 1);
  });
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Interaction State
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(false);
  
  // Viewer Sheet State
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerData[]>([]);
  const [realtimeViewCount, setRealtimeViewCount] = useState(0);
  
  // Media State
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived
  const currentUser = users[userIndex];
  const currentStory = currentUser?.stories[storyIndex];
  const isOwnStory = currentStory?.user_id === user?.id;

  // --- Helpers ---

  // Dynamic Duration
  const getDuration = () => {
    if (currentStory?.media_type === 'video' && videoDuration) {
      return videoDuration * 1000;
    }
    return (currentStory?.duration || 5) * 1000; 
  };
  const STORY_DURATION = getDuration();

  // Reset logic when switching users
  useEffect(() => {
    if (users.length === 0) { onClose(); return; }
    const clamped = Math.min(Math.max(initialUserIndex, 0), users.length - 1);
    setUserIndex(clamped);
    setStoryIndex(0);
    setProgress(0);
    setVideoDuration(null);
    setLiked(false);
    setReplyText('');
  }, [initialUserIndex, users.length]);

  // Check if current user liked the story
  useEffect(() => {
    if (!currentStory || !user) return;
    const checkLikeStatus = async () => {
      const { data } = await supabase
        .from('story_likes')
        .select('id')
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setLiked(!!data);
    };
    checkLikeStatus();
  }, [currentStory, user]);

  // Record View 
  useEffect(() => {
    if (!currentStory || !user || isOwnStory) return;
    const recordView = async () => {
      await supabase.from('story_views').upsert(
        { story_id: currentStory.id, viewer_id: user.id },
        { onConflict: 'story_id, viewer_id', ignoreDuplicates: true }
      );
    };
    recordView();
  }, [currentStory?.id, user?.id, isOwnStory]);

  // --- Navigation ---
  const goToNextUser = useCallback(() => {
    if (userIndex < users.length - 1) { 
        setUserIndex(prev => prev + 1); 
        setStoryIndex(0); 
        setProgress(0); 
        setVideoDuration(null);
        setLiked(false);
    } else { onClose(); }
  }, [userIndex, users.length, onClose]);

  const goToNextStory = useCallback(() => {
    const cu = users[userIndex];
    if (!cu || (cu.stories?.length ?? 0) === 0) { onClose(); return; }
    if (storyIndex < (cu.stories.length - 1)) { 
        setStoryIndex(prev => prev + 1); 
        setProgress(0); 
        setVideoDuration(null);
        setLiked(false);
    } else { goToNextUser(); }
  }, [users, userIndex, storyIndex, goToNextUser, onClose]);

  const goToPrevStory = useCallback(() => {
    if (storyIndex > 0) { 
        setStoryIndex(prev => prev - 1); 
        setProgress(0); 
        setVideoDuration(null);
        setLiked(false);
    } else if (userIndex > 0) {
      const prevUser = users[userIndex - 1];
      setUserIndex(prev => prev - 1);
      setStoryIndex(Math.max(0, (prevUser.stories?.length ?? 0) - 1));
      setProgress(0);
      setVideoDuration(null);
      setLiked(false);
    }
  }, [storyIndex, userIndex, users]);

  // --- Timer ---
  useEffect(() => {
    if (isPaused || !currentUser || !currentStory) return;
    if (currentStory.media_type === 'video' && !videoDuration) return;

    const interval = setInterval(() => {
      setProgress(prev => { 
        if (prev >= 100) { 
          goToNextStory(); 
          return 0; 
        } 
        return prev + (100 / (STORY_DURATION / 100)); 
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPaused, goToNextStory, currentUser?.userId, currentStory?.id, videoDuration, STORY_DURATION]);


  // --- Actions ---

  const handleLike = async () => {
    if (!currentStory || !user) return;
    const newStatus = !liked;
    setLiked(newStatus); // Optimistic UI update

    if (newStatus) {
      await supabase.from('story_likes').insert({ user_id: user.id, story_id: currentStory.id });
    } else {
      await supabase.from('story_likes').delete().eq('user_id', user.id).eq('story_id', currentStory.id);
    }
  };

  // --- FIXED REPLY FUNCTION WITH THUMBNAIL ATTACHMENT ---
  const handleSendReply = async () => {
    if (!replyText.trim() || !currentStory || !user || !currentUser) return;
    
    setIsPaused(true);
    const text = replyText;
    setReplyText(''); // Clear input immediately
    
    try {
      // 1. Check if conversation exists
      let convoId = null;
      
      const { data: existingConvo } = await supabase.from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${currentUser.userId}),and(participant_1.eq.${currentUser.userId},participant_2.eq.${user.id})`)
        .maybeSingle();

      if (existingConvo) {
        convoId = existingConvo.id;
      } else {
        // 2. Create if not exists
        const { data: newConvo, error: createError } = await supabase.from('conversations')
          .insert({ participant_1: user.id, participant_2: currentUser.userId })
          .select()
          .single();
        
        if (createError) throw createError;
        convoId = newConvo.id;
      }

      // 3. Send Message WITH MEDIA ATTACHMENT
      // We pass the story's media_url as the message's media_url so it shows as a thumbnail
      const { error: msgError } = await supabase.from('direct_messages').insert({
        conversation_id: convoId,
        sender_id: user.id,
        content: `Replied to your story: ${text}`, // Context
        story_id: currentStory.id,
        // ATTACH THE THUMBNAIL HERE:
        media_url: currentStory.media_url || null, 
        message_type: currentStory.media_type || 'text'
      });

      if (msgError) throw msgError;

      // 4. Update Conversation Timestamp
      await supabase.from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convoId);
      
      toast.success("Reply sent!");

    } catch (error: any) {
      console.error(error);
      toast.error("Failed to send reply");
      setReplyText(text); // Restore text on fail
    } finally {
      setIsPaused(false);
    }
  };

  const fetchViewersData = async () => {
    if (!currentStory) return;
    
    // 1. Fetch Views
    const { data: viewsData, error } = await supabase
      .from('story_views')
      .select(`id, viewer_id, viewed_at`)
      .eq('story_id', currentStory.id)
      .order('viewed_at', { ascending: false });

    // 2. Fetch Likes for this story
    const { data: likesData } = await supabase
      .from('story_likes')
      .select('user_id')
      .eq('story_id', currentStory.id);

    const likerIds = new Set(likesData?.map(l => l.user_id));

    if (!error && viewsData) {
      setRealtimeViewCount(viewsData.length);
      const viewerIds = viewsData.map(v => v.viewer_id);
      
      // 3. Fetch Profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', viewerIds);
        
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      setViewers(viewsData.map(v => ({ 
        ...v, 
        profile: profileMap.get(v.viewer_id),
        has_liked: likerIds.has(v.viewer_id) 
      })));
    }
  };

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

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) goToPrevStory(); else if (info.offset.x < -threshold) goToNextStory(); else if (info.offset.y > threshold * 2) onClose();
  };

  if (!currentUser || !currentStory) return null;

  const content = (
    <motion.div ref={containerRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black flex items-center justify-center" style={{ zIndex: 99999 }}>
      
      {/* --- Top Controls --- */}
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

      {/* --- Main Story Card --- */}
      <motion.div 
        drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd} 
        onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} 
        onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} 
        className="relative w-full max-w-md h-full max-h-[90vh] mx-auto touch-pan-y"
      >
        
        {/* Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
          {currentUser.stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white" 
                initial={{ width: idx < storyIndex ? '100%' : '0%' }} 
                animate={{ width: idx < storyIndex ? '100%' : idx === storyIndex ? `${progress}%` : '0%' }} 
                transition={{ duration: 0.1 }} 
              />
            </div>
          ))}
        </div>

        {/* Header Info */}
        <div className="absolute top-8 left-3 right-3 flex items-center gap-3 z-20">
          <Avatar className="h-10 w-10 ring-2 ring-white/50"><AvatarImage src={currentUser.avatarUrl || undefined} /><AvatarFallback className="bg-primary text-primary-foreground">{currentUser.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0"><p className="text-white font-semibold text-sm truncate">{currentUser.username}</p><p className="text-white/60 text-xs">{formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}</p></div>
          {currentStory.media_type === 'video' && <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-black/30 text-white">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>}
        </div>

        {/* Media Content */}
        <motion.div key={currentStory.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full rounded-xl overflow-hidden" style={{ backgroundColor: currentStory.media_url ? 'black' : (currentStory.background_color || '#6366f1') }}>
          {currentStory.media_url ? (
            currentStory.media_type === 'video' ? (
                <video ref={videoRef} src={currentStory.media_url} className="w-full h-full object-contain" autoPlay muted={isMuted} onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)} playsInline />
            ) : (
                <img src={currentStory.media_url} alt="Story" className="w-full h-full object-contain" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8"><p className="text-white text-2xl md:text-3xl font-bold text-center leading-relaxed">{currentStory.content}</p></div>
          )}
        </motion.div>

        {/* --- Bottom Interactions --- */}
        <div className="absolute bottom-4 left-3 right-3 z-30">
          {isOwnStory ? (
            <button 
                onClick={() => { fetchViewersData(); setShowViewers(true); setIsPaused(true); }} 
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-all mx-auto w-full justify-center border border-white/10"
            >
                <Users className="h-5 w-5" />
                <span className="font-bold">{realtimeViewCount > 0 ? `${realtimeViewCount} Viewers` : 'No views yet'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Input 
                value={replyText} 
                onChange={(e) => setReplyText(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                placeholder={`Reply to ${currentUser.username}...`} 
                className="bg-black/40 backdrop-blur-md border-white/20 text-white rounded-full h-12 pl-5 focus:border-white/50 focus:bg-black/60 transition-all placeholder:text-white/50 flex-1" 
                onFocus={() => setIsPaused(true)} 
                onBlur={() => setIsPaused(false)} 
              />
              
              {/* Send (only if typing) */}
              {replyText.trim().length > 0 && (
                <button 
                  onClick={handleSendReply}
                  className="p-3 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-90 transition-all animate-in zoom-in"
                >
                  <Send className="h-5 w-5" />
                </button>
              )}

              {/* Like Button */}
              <button 
                onClick={handleLike}
                className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-90 transition-transform hover:bg-white/10"
              >
                <Heart className={`h-6 w-6 transition-colors ${liked ? "fill-purple-500 text-purple-500" : "text-white"}`} />
              </button>
            </div>
          )}
        </div>

        {/* Tap Zones */}
        <button onClick={goToPrevStory} className="absolute left-0 top-20 bottom-24 w-1/4 z-10 opacity-0">Prev</button>
        <button onClick={goToNextStory} className="absolute right-0 top-20 bottom-24 w-1/4 z-10 opacity-0">Next</button>
      </motion.div>

      {/* --- Viewers Sheet --- */}
      <Sheet open={showViewers} onOpenChange={(open) => { setShowViewers(open); if (!open) setIsPaused(false); }}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl border-t border-border">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Story Insights</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(60vh-100px)]">
            {viewers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No views yet.</p>
            ) : (
                viewers.map((viewer) => (
                <div key={viewer.id} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/10 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border"><AvatarImage src={viewer.profile?.avatar_url || undefined} /><AvatarFallback>{viewer.profile?.username?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback></Avatar>
                        <div>
                            <p className="font-bold text-sm">{viewer.profile?.username || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}</p>
                        </div>
                    </div>
                    {viewer.has_liked && (
                        <div className="p-2 bg-purple-500/10 rounded-full">
                            <Heart className="h-4 w-4 fill-purple-500 text-purple-500" />
                        </div>
                    )}
                </div>
                ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* --- Delete Dialog --- */}
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