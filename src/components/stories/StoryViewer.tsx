import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Trash2, MoreVertical, Heart, Eye, Share2, ChevronRight, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogTitle, AlertDialogFooter, AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CreateStoryModal } from "./CreateStoryModal";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [showReshare, setShowReshare] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [realtimeViewCount, setRealtimeViewCount] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const currentUser = users[userIndex];
  const currentStory = currentUser?.stories[storyIndex];
  const isOwnStory = currentStory?.user_id === user?.id;
  const isMentioned = currentStory?.mentions?.includes(user?.id || '');

  useEffect(() => {
    if (!currentUser) { onClose(); return; }
    setStoryIndex(0); setProgress(0); setLiked(false);
    setRealtimeViewCount(currentStory?.view_count || 0);
  }, [userIndex]);

  useEffect(() => {
    if (!currentStory || !user) return;
    supabase.from('story_likes').select('id').eq('story_id', currentStory.id).eq('user_id', user.id).maybeSingle().then(({ data }) => setLiked(!!data));
    if (currentStory.mentions?.length) {
      supabase.from('profiles').select('user_id, username').in('user_id', currentStory.mentions).then(({ data }) => setMentionedUsers(data || []));
    } else setMentionedUsers([]);
    if (!isOwnStory) supabase.rpc('increment_story_view', { p_story_id: currentStory.id, p_viewer_id: user.id });
  }, [currentStory, user]);

  useEffect(() => {
    if (isPaused || !currentStory) return;
    const duration = currentStory.media_type === 'video' ? (videoDuration ? videoDuration * 1000 : 15000) : (currentStory.duration || 5) * 1000;
    const interval = setInterval(() => {
      setProgress(prev => { if (prev >= 100) { handleNext(); return 0; } return prev + (100 / (duration / 100)); });
    }, 100);
    return () => clearInterval(interval);
  }, [isPaused, currentStory, videoDuration]);

  const handleNext = () => {
    if (storyIndex < currentUser.stories.length - 1) { setStoryIndex(p => p + 1); setProgress(0); }
    else if (userIndex < users.length - 1) setUserIndex(p => p + 1);
    else onClose();
  };

  const handlePrev = () => {
    if (storyIndex > 0) { setStoryIndex(p => p - 1); setProgress(0); }
    else if (userIndex > 0) setUserIndex(p => p - 1);
  };

  const handleLike = async () => {
    setLiked(!liked); setShowHeartAnim(true); setTimeout(() => setShowHeartAnim(false), 800);
    if (!liked) await supabase.from('story_likes').insert({ user_id: user?.id, story_id: currentStory.id });
    else await supabase.from('story_likes').delete().eq('user_id', user?.id).eq('story_id', currentStory.id);
  };

  const handleDelete = async () => {
    await supabase.from('stories').delete().eq('id', currentStory.id);
    toast.success("Story deleted");
    onRefresh(); onClose();
  };

  const fetchViewers = async () => {
    setIsPaused(true); setShowViewers(true);
    const { data } = await supabase.from('story_views').select(`viewed_at, profiles(username, avatar_url, full_name)`).eq('story_id', currentStory.id).order('viewed_at', { ascending: false });
    if (data) { setViewers(data.map((v: any) => ({ ...v.profiles, viewed_at: v.viewed_at }))); setRealtimeViewCount(data.length); }
  };

  if (!currentUser || !currentStory) return null;

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/95 z-[99999] flex items-center justify-center backdrop-blur-sm">
      <button onClick={handlePrev} className="hidden md:flex absolute left-4 text-white/50 hover:text-white p-4"><ChevronLeft className="w-12 h-12" /></button>
      <button onClick={handleNext} className="hidden md:flex absolute right-4 text-white/50 hover:text-white p-4"><ChevronRight className="w-12 h-12" /></button>

      <motion.div className="relative w-full md:max-w-[420px] h-full md:h-[85vh] bg-black md:rounded-[32px] overflow-hidden shadow-2xl border border-white/10" onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}>
        <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-30">
          {currentUser.stories.map((_: any, i: number) => (
            <div key={i} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
              <motion.div className="h-full bg-white shadow-[0_0_10px_white]" initial={{ width: i < storyIndex ? '100%' : '0%' }} animate={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }} transition={{ duration: 0.1, ease: "linear" }} />
            </div>
          ))}
        </div>

        <div className="absolute top-8 left-4 right-4 flex items-start justify-between z-50 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto cursor-pointer" onClick={() => { onClose(); navigate(`/profile/${currentUser.username}`); }}>
            <Avatar className="h-9 w-9 ring-2 ring-white/30"><AvatarImage src={currentUser.avatarUrl} /><AvatarFallback>{currentUser.username[0]}</AvatarFallback></Avatar>
            <div><p className="text-white font-bold text-sm shadow-black drop-shadow-md">{currentUser.username}</p><p className="text-white/70 text-[10px]">{formatDistanceToNow(new Date(currentStory.created_at))} ago</p></div>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            {isOwnStory && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><button className="p-2 text-white/90 bg-black/20 rounded-full backdrop-blur-sm hover:bg-black/40"><MoreVertical className="w-5 h-5" /></button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-white z-[60]"><DropdownMenuItem onClick={() => { setIsPaused(true); setShowDeleteDialog(true); }} className="text-red-500 cursor-pointer"><Trash2 className="w-4 h-4 mr-2" /> Delete Story</DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            )}
            <button onClick={onClose} className="p-2 text-white/90 bg-black/20 rounded-full backdrop-blur-sm hover:bg-black/40"><X className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="w-full h-full flex items-center justify-center bg-neutral-900">
          {currentStory.media_url ? (
            currentStory.media_type === 'video' ? 
              <video ref={videoRef} src={currentStory.media_url} className="w-full h-full object-cover" autoPlay muted playsInline onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)} /> :
              <img src={currentStory.media_url} className="w-full h-full object-cover" alt="story" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8 text-center" style={{ background: currentStory.background_color || '#222' }}>
              <p className="text-white font-bold text-2xl leading-relaxed">{currentStory.content}</p>
            </div>
          )}
          {currentStory.content && currentStory.media_url && <div className="absolute bottom-32 bg-black/50 px-4 py-2 rounded-xl text-white font-medium backdrop-blur-md z-20 text-center max-w-[90%]">{currentStory.content}</div>}
          
          {mentionedUsers.map((u, i) => (
            <div key={i} onClick={(e) => { e.stopPropagation(); onClose(); navigate(`/profile/${u.username}`); }} className="absolute top-1/2 left-1/2 bg-white text-black px-4 py-1.5 rounded-lg shadow-xl flex items-center gap-1 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer active:scale-95 transition-transform z-40">
               <span className="text-purple-600 font-black">@</span><span className="font-bold text-sm uppercase">{u.username}</span>
            </div>
          ))}
        </div>

        <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrev} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={handleNext} />

        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black/90 to-transparent z-30 flex items-center gap-3">
          {isOwnStory ? (
            <button onClick={fetchViewers} className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-white w-full justify-center active:scale-95 transition-transform">
              <Eye className="w-4 h-4" /><span className="font-bold text-sm">{realtimeViewCount > 0 ? `${realtimeViewCount} Viewers` : 'No views'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 w-full">
              {isMentioned && (
                <button onClick={() => { setIsPaused(true); setShowReshare(true); }} className="px-4 py-2 bg-white text-black rounded-full font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-transform whitespace-nowrap">
                   <Share2 className="w-4 h-4" /> Add to your story
                </button>
              )}
              <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Reply...`} className="flex-1 bg-white/10 border-white/10 text-white rounded-full h-12 px-5 backdrop-blur-md focus:bg-white/20" onFocus={() => setIsPaused(true)} onBlur={() => setIsPaused(false)} />
              <div className="relative">
                <AnimatePresence>{showHeartAnim && <motion.div initial={{ opacity: 0, scale: 0.5, y: 0 }} animate={{ opacity: 1, scale: 1.5, y: -50 }} exit={{ opacity: 0 }} className="absolute -top-10 left-0 pointer-events-none"><Heart className="w-10 h-10 fill-purple-500 text-purple-500" /></motion.div>}</AnimatePresence>
                <button onClick={handleLike} className="p-3 rounded-full hover:bg-white/10 active:scale-90 transition-transform"><Heart className={`w-8 h-8 transition-colors ${liked ? "fill-purple-500 text-purple-500" : "text-white"}`} /></button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <Sheet open={showViewers} onOpenChange={(o) => { setShowViewers(o); if(!o) setIsPaused(false); }}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-[32px] bg-neutral-900 border-none p-0 text-white z-[100000]">
           <div className="flex justify-center p-3"><div className="w-10 h-1 bg-white/20 rounded-full" /></div>
           <div className="px-6 pb-4 border-b border-white/5"><h2 className="text-white font-bold text-lg flex items-center gap-2"><Eye className="w-5 h-5 text-purple-500" /> {viewers.length} Views</h2></div>
           <div className="overflow-y-auto h-full px-4 pb-20 pt-2 space-y-2">
              {viewers.length === 0 && <p className="text-center text-white/30 py-10">No views yet.</p>}
              {viewers.map((v, i) => (
                 <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-colors">
                    <div className="flex items-center gap-3"><Avatar className="w-10 h-10 border border-white/10"><AvatarImage src={v.avatar_url} /><AvatarFallback>{v.username?.[0]}</AvatarFallback></Avatar><div><p className="text-white font-bold text-sm">{v.username}</p><p className="text-white/40 text-xs">{v.full_name}</p></div></div>
                    <span className="text-white/30 text-[10px]">{formatDistanceToNow(new Date(v.viewed_at))} ago</span>
                 </div>
              ))}
           </div>
        </SheetContent>
      </Sheet>

      <CreateStoryModal 
         open={showReshare} 
         onOpenChange={(o) => { setShowReshare(o); if(!o) setIsPaused(false); }} 
         onCreated={() => { setShowReshare(false); toast.success("Shared!"); }} 
         reshareStoryId={currentStory?.id} 
         reshareMediaUrl={currentStory?.media_url} 
         reshareMediaType={currentStory?.media_type}
         reshareUser={currentUser} // PASSES USER INFO FOR CARD
      />
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl z-[100001]"><AlertDialogHeader><AlertDialogTitle>Delete Story?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-white/10 border-none text-white hover:bg-white/20">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white hover:bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </motion.div>, document.body
  );
}