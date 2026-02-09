import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Send, Image, Smile, MoreVertical, Loader2, 
  Check, CheckCheck, X, Play, Trash2, Reply, Ban, Flag, Copy, 
  Maximize2, Download
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isYesterday } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getInitials } from "@/lib/utils";
import { StoryViewer } from "@/components/stories/StoryViewer";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  message_type: string;
  is_read: boolean;
  created_at: string;
  story_id?: string;
  reply_to_id?: string;
  is_deleted?: boolean;
}

interface OtherUser {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface ChatViewProps {
  conversationId: string;
  otherUser: OtherUser;
  onBack: () => void;
  onMessageRead?: () => void;
}

const EMOJI_LIST = ["😀", "😂", "😍", "🥰", "😎", "🔥", "❤️", "👍", "👏", "🎉", "💯", "✨", "🙌", "💪", "🤔", "😢"];

export function ChatView({ conversationId, otherUser, onBack, onMessageRead }: ChatViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; preview: string; type: 'image' | 'video' } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewingStoryUser, setViewingStoryUser] = useState<any[] | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // --- REFS ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- MEMOIZED HELPERS ---
  const messageMap = useMemo(() => {
    return new Map(messages.map(m => [m.id, m]));
  }, [messages]);

  // --- EFFECTS ---
  useEffect(() => {
    fetchMessages();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [conversationId]);

  useEffect(() => {
    if (user && messages.length > 0) markMessagesAsRead();
    scrollToBottom();
  }, [conversationId, user, messages.length]);

  // --- FUNCTIONS ---

  const fetchMessages = async () => {
    const { data } = await supabase.from("direct_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
    
    if (data) setMessages(data as Message[]);
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
    await supabase.from("direct_messages")
        .update({ is_read: true, seen_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false);
    
    if (onMessageRead) onMessageRead();
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase.channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const scrollToBottom = () => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate size (e.g. 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large (Max 50MB)");
      return;
    }

    const isImage = file.type.startsWith('image/');
    const preview = URL.createObjectURL(file);
    setSelectedMedia({ file, preview, type: isImage ? 'image' : 'video' });
  };

  const sendMessage = async () => {
    if (!user || (!newMessage.trim() && !selectedMedia)) return;
    setSending(true);
    const text = newMessage.trim();
    const replyId = replyingTo?.id;
    
    // Optimistic Clear
    setNewMessage("");
    setReplyingTo(null);
    const currentMedia = selectedMedia;
    setSelectedMedia(null);

    try {
      let mediaUrl = null;
      let type = 'text';
      
      if (currentMedia) {
        setUploading(true);
        const { url } = await uploadFile('chat', currentMedia.file, user.id);
        mediaUrl = url;
        type = currentMedia.type;
        setUploading(false);
      }

      const { error } = await supabase.from("direct_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: text || (type === 'image' ? '📷 Photo' : '🎥 Video'),
        media_url: mediaUrl,
        message_type: type,
        reply_to_id: replyId
      });

      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    } catch (error) {
      toast.error("Failed to send");
      setNewMessage(text); // Restore on fail
      if (currentMedia) setSelectedMedia(currentMedia);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
      const { error } = await supabase.from('direct_messages').update({ is_deleted: true, content: '🚫 Message deleted', media_url: null }).eq('id', messageId);
      if (error) toast.error("Could not delete message");
  };

  const handleBlockUser = async () => {
      const { error } = await supabase.from('blocks').insert({ blocker_id: user?.id, blocked_id: otherUser.user_id });
      if (error) toast.error("Failed to block user");
      else { toast.success(`Blocked ${otherUser.full_name}`); onBack(); }
  };

  const handleStoryClick = async (storyId: string) => {
    if (!storyId) return;
    const { data: story } = await supabase.from('stories').select('*').eq('id', storyId).maybeSingle();
    if (!story) { toast.error("This story is no longer available"); return; }
    
    // Construct viewer data
    setViewingStoryUser([{
        userId: story.user_id,
        username: otherUser.username || "User",
        avatarUrl: otherUser.avatar_url,
        stories: [story]
    }]);
  };

  const renderDateSeparator = (date: string) => {
    const d = new Date(date);
    let label = format(d, 'MMMM d, yyyy');
    if (isToday(d)) label = "Today";
    if (isYesterday(d)) label = "Yesterday";
    
    return (
      <div className="flex justify-center my-4">
        <span className="text-[10px] font-bold bg-secondary/50 px-3 py-1 rounded-full text-muted-foreground uppercase tracking-widest backdrop-blur-md border border-white/5">
          {label}
        </span>
      </div>
    );
  };

  // --- RENDER ---
  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* HEADER */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-background/80 backdrop-blur-xl z-20 sticky top-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden"><ArrowLeft className="h-5 w-5" /></Button>
        <Link to={`/profile/${otherUser.username}`} className="flex items-center gap-3 flex-1">
          <Avatar className="h-10 w-10 ring-2 ring-border/50">
            <AvatarImage src={otherUser.avatar_url || ""} />
            <AvatarFallback>{getInitials(otherUser.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">{otherUser.full_name}</span>
            <span className="text-[10px] text-muted-foreground font-medium mt-1 flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
            </span>
          </div>
        </Link>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 opacity-70" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card border-white/10">
                <DropdownMenuItem onClick={() => navigate(`/profile/${otherUser.username}`)}>View Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleBlockUser}><Ban className="h-4 w-4 mr-2" /> Block User</DropdownMenuItem>
                <DropdownMenuItem className="text-yellow-500"><Flag className="h-4 w-4 mr-2" /> Report</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        {messages.map((message, index) => {
          const isOwn = message.sender_id === user?.id;
          const isStoryReply = !!message.story_id;
          const isDeleted = message.is_deleted;
          const repliedMessage = message.reply_to_id ? messageMap.get(message.reply_to_id) : null;
          
          // Date Separator Logic
          const showDate = index === 0 || new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

          return (
            <div key={message.id}>
              {showDate && renderDateSeparator(message.created_at)}
              
              <ContextMenu>
                <ContextMenuTrigger>
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`flex flex-col ${isOwn ? "items-end" : "items-start"} mb-2`}>
                    
                    {/* REPLIED MESSAGE PREVIEW */}
                    {repliedMessage && !isDeleted && (
                        <div 
                          onClick={() => document.getElementById(`msg-${repliedMessage.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                          className={`mb-1 text-xs opacity-70 px-3 py-1.5 rounded-xl bg-secondary/30 backdrop-blur-sm cursor-pointer hover:bg-secondary/50 transition-colors max-w-[80%] flex items-center gap-2 border-l-2 ${isOwn ? 'border-primary mr-1' : 'border-muted-foreground ml-1'}`}
                        >
                            <Reply className="h-3 w-3" />
                            <div className="flex flex-col truncate">
                              <span className="font-bold text-[9px] opacity-70">Replying to {repliedMessage.sender_id === user?.id ? 'You' : otherUser.full_name}</span>
                              <span className="truncate">{repliedMessage.content}</span>
                            </div>
                        </div>
                    )}

                    <div id={`msg-${message.id}`} className={`max-w-[85%] md:max-w-[70%] px-4 py-2.5 shadow-sm relative group transition-all duration-200 
                      ${isOwn 
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl rounded-tr-sm" 
                        : "bg-secondary/80 backdrop-blur-md text-secondary-foreground rounded-2xl rounded-tl-sm border border-white/5"
                      } ${isDeleted ? 'opacity-50 italic border border-dashed border-muted-foreground/30 bg-transparent' : ''}`}
                    >
                        
                        {/* STORY REPLY HEADER */}
                        {isStoryReply && !isDeleted && (
                            <div onClick={() => message.story_id && handleStoryClick(message.story_id)} className="cursor-pointer mb-2 pb-2 border-b border-white/20 flex items-center gap-3">
                                <div className="h-10 w-8 bg-black/50 rounded overflow-hidden relative border border-white/10">
                                  {message.media_url?.match(/\.(mp4|webm)$/i) ? <video src={message.media_url || ""} className="h-full w-full object-cover" /> : <img src={message.media_url || ""} className="h-full w-full object-cover" />}
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Play className="h-3 w-3 text-white fill-white" /></div>
                                </div>
                                <div className="flex flex-col">
                                  <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold">Replied to story</p>
                                  <p className="text-xs font-bold underline decoration-white/30">View Story</p>
                                </div>
                            </div>
                        )}

                        {/* MEDIA CONTENT */}
                        {message.media_url && !isStoryReply && !isDeleted && (
                        <div className="mb-2 mt-1">
                            {message.message_type === 'video' ? (
                                <video src={message.media_url} controls className="rounded-lg max-w-full max-h-[300px] object-cover" />
                            ) : (
                                <div className="cursor-pointer overflow-hidden rounded-lg group/img" onClick={() => setLightboxImage(message.media_url)}>
                                   <img src={message.media_url} className="w-full max-h-[300px] object-cover transition-transform group-hover/img:scale-105" alt="media" />
                                </div>
                            )}
                        </div>
                        )}
                        
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        
                        {/* TIMESTAMP & STATUS */}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"} text-[10px]`}>
                          <span>{format(new Date(message.created_at), "h:mm a")}</span>
                          {isOwn && !isDeleted && (message.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3 opacity-70" />)}
                        </div>

                    </div>
                  </motion.div>
                </ContextMenuTrigger>
                
                <ContextMenuContent className="w-48">
                    <ContextMenuItem onClick={() => setReplyingTo(message)}><Reply className="h-4 w-4 mr-2" /> Reply</ContextMenuItem>
                    <ContextMenuItem onClick={() => navigator.clipboard.writeText(message.content)}><Copy className="h-4 w-4 mr-2" /> Copy</ContextMenuItem>
                    {isOwn && !isDeleted && (
                        <>
                            <DropdownMenuSeparator />
                            <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteMessage(message.id)}><Trash2 className="h-4 w-4 mr-2" /> Unsend</ContextMenuItem>
                        </>
                    )}
                </ContextMenuContent>
            </ContextMenu>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* --- REPLY PREVIEW BOX --- */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 py-2 bg-secondary/40 border-t border-border/50 flex justify-between items-center backdrop-blur-md mx-2 rounded-t-2xl mt-2">
                <div className="text-sm border-l-4 border-primary pl-3">
                    <p className="text-xs font-bold text-primary mb-0.5">Replying to {replyingTo.sender_id === user?.id ? "Yourself" : otherUser.full_name}</p>
                    <p className="text-xs opacity-70 truncate max-w-[250px]">{replyingTo.content}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background/50 hover:bg-background" onClick={() => setReplyingTo(null)}><X className="h-3 w-3" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- INPUT BOX --- */}
      <div className="p-3 bg-background/80 backdrop-blur-xl border-t border-white/5 pb-safe">
        {selectedMedia && (
          <div className="mb-3 mx-4 relative inline-block animate-in zoom-in duration-200">
            {selectedMedia.type === 'image' ? <img src={selectedMedia.preview} className="h-24 w-24 object-cover rounded-xl shadow-lg border border-white/10" /> : <video src={selectedMedia.preview} className="h-24 w-24 object-cover rounded-xl shadow-lg" />}
            <button onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1.5 shadow-md hover:scale-110 transition-transform"><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,video/*" />
          
          <Button variant="ghost" size="icon" className="rounded-full shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors h-10 w-10" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Image className="h-5 w-5" />
          </Button>
          
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full shrink-0 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors h-10 w-10 hidden sm:flex">
                    <Smile className="h-5 w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="start" sideOffset={10}>
              <div className="grid grid-cols-8 gap-1 p-2 bg-secondary/90 backdrop-blur-xl max-h-60 overflow-y-auto">
                {EMOJI_LIST.map((emoji) => <button key={emoji} onClick={() => {setNewMessage(prev => prev + emoji); setShowEmojiPicker(false);}} className="text-2xl hover:bg-white/10 rounded-lg p-2 transition-colors">{emoji}</button>)}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex-1 bg-secondary/50 rounded-[24px] border border-white/5 focus-within:ring-2 focus-within:ring-primary/50 focus-within:bg-secondary/80 transition-all flex items-center min-h-[44px]">
             <Input 
                placeholder="Message..." 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="bg-transparent border-none h-full py-2 px-4 focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
          </div>
          
          <Button 
            size="icon" 
            onClick={sendMessage} 
            disabled={(!newMessage.trim() && !selectedMedia) || sending || uploading} 
            className={`rounded-full h-11 w-11 shrink-0 shadow-lg transition-all duration-300 ${(!newMessage.trim() && !selectedMedia) ? 'bg-secondary text-muted-foreground opacity-50' : 'bg-primary text-primary-foreground hover:scale-105 active:scale-95'}`}
          >
            {sending || uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
          </Button>
        </div>
      </div>

      {/* --- STORY VIEWER OVERLAY --- */}
      {viewingStoryUser && (
        <StoryViewer
            users={viewingStoryUser}
            initialUserIndex={0}
            onClose={() => setViewingStoryUser(null)}
            onRefresh={() => {}}
        />
      )}

      {/* --- IMAGE LIGHTBOX --- */}
      {lightboxImage && (
        <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
            <DialogContent className="max-w-screen-lg w-full h-full max-h-screen bg-black/95 border-none p-0 flex items-center justify-center">
                <div className="relative w-full h-full flex items-center justify-center">
                     <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 z-50"><X className="h-6 w-6" /></button>
                     <img src={lightboxImage} className="max-w-full max-h-full object-contain" />
                </div>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}