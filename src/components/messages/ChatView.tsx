import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ArrowLeft, Send, Image, Smile, MoreVertical, Loader2, 
    Check, CheckCheck, X, Play, Trash2, Reply, Ban, Flag, Copy 
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
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
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // --- REFS ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    fetchMessages();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [conversationId]);

  useEffect(() => {
    if (user) markMessagesAsRead();
  }, [conversationId, user, messages.length]); // Re-run when new messages arrive

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          if (payload.new.sender_id !== user?.id) markMessagesAsRead();
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

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const preview = URL.createObjectURL(file);
    setSelectedMedia({ file, preview, type: isImage ? 'image' : 'video' });
  };

  const sendMessage = async () => {
    if (!user || (!newMessage.trim() && !selectedMedia)) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");
    const replyId = replyingTo?.id;
    setReplyingTo(null); // Clear reply state

    try {
      let mediaUrl = null;
      let type = 'text';
      if (selectedMedia) {
        setUploading(true);
        const { url } = await uploadFile('chat', selectedMedia.file, user.id);
        mediaUrl = url;
        type = selectedMedia.type;
        setSelectedMedia(null);
        setUploading(false);
      }

      await supabase.from("direct_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: text || (type === 'image' ? '📷 Photo' : '🎥 Video'),
        media_url: mediaUrl,
        message_type: type,
        reply_to_id: replyId // New field
      });

      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    } catch (error) {
      toast.error("Failed to send");
      setNewMessage(text);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
      // Soft delete: Update 'is_deleted' to true
      const { error } = await supabase
        .from('direct_messages')
        .update({ is_deleted: true, content: '🚫 Message deleted' })
        .eq('id', messageId);
      
      if (error) toast.error("Could not delete message");
      else toast.success("Message deleted");
  };

  const handleBlockUser = async () => {
      const { error } = await supabase.from('blocks').insert({ blocker_id: user?.id, blocked_id: otherUser.user_id });
      if (error) toast.error("Failed to block user");
      else {
          toast.success(`Blocked ${otherUser.full_name}`);
          onBack(); // Exit chat
      }
  };

  // --- ROBUST STORY CLICK HANDLER ---
  const handleStoryClick = async (storyId: string) => {
    if (!storyId) return;
    
    // 1. Fetch the Story
    const { data: story, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .maybeSingle();

    if (storyError || !story) {
        toast.error("This story has expired or been deleted");
        return;
    }

    // 2. Fetch the Author's Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', story.user_id) 
        .maybeSingle();

    // 3. Construct Data for Viewer
    const userWithStories = [{
        userId: story.user_id,
        username: profile?.username || "User",
        avatarUrl: profile?.avatar_url || null,
        stories: [story]
    }];

    setViewingStoryUser(userWithStories);
  };

  const isVideoUrl = (url: string | null) => url?.match(/\.(mp4|webm|ogg|mov)$/i);

  // --- RENDER ---
  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* HEADER */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-background/80 backdrop-blur-lg z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden"><ArrowLeft className="h-5 w-5" /></Button>
        <Link to={`/profile/${otherUser.username}`} className="flex items-center gap-3 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser.avatar_url || ""} />
            <AvatarFallback>{getInitials(otherUser.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{otherUser.full_name}</span>
            <span className="text-[10px] text-green-500 font-medium">Online</span>
          </div>
        </Link>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/profile/${otherUser.username}`)}>View Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleBlockUser}><Ban className="h-4 w-4 mr-2" /> Block User</DropdownMenuItem>
                <DropdownMenuItem className="text-yellow-500"><Flag className="h-4 w-4 mr-2" /> Report</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          const isStoryReply = !!message.story_id;
          const isDeleted = message.is_deleted;
          
          // Find replied message text if it exists
          const repliedMessage = message.reply_to_id ? messages.find(m => m.id === message.reply_to_id) : null;

          return (
            <ContextMenu key={message.id}>
                <ContextMenuTrigger>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    
                    {/* REPLIED MESSAGE PREVIEW */}
                    {repliedMessage && (
                        <div className={`mb-1 text-xs opacity-70 px-3 py-1 rounded-lg border-l-2 bg-secondary/30 ${isOwn ? 'border-primary mr-2' : 'border-secondary-foreground ml-2'}`}>
                            <span className="font-bold block text-[10px] opacity-50">Replying to {repliedMessage.sender_id === user?.id ? 'Yourself' : otherUser.full_name}</span>
                            {repliedMessage.content.substring(0, 30)}...
                        </div>
                    )}

                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl relative group ${isOwn ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-secondary-foreground rounded-bl-none"} ${isDeleted ? 'opacity-50 italic' : ''}`}>
                        
                        {isStoryReply && !isDeleted && (
                            <div className="mb-2 pb-2 border-b border-white/20">
                                <p className="text-[10px] opacity-70 mb-1 uppercase tracking-wider font-bold">Replied to story</p>
                            </div>
                        )}

                        {message.media_url && !isDeleted && (
                        <div 
                            onClick={() => isStoryReply && message.story_id ? handleStoryClick(message.story_id) : null}
                            className={`relative ${isStoryReply ? 'cursor-pointer hover:opacity-90 transition-opacity active:scale-95' : ''}`}
                        >
                            {isStoryReply && (
                                <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full z-10">
                                    <Play className="h-3 w-3 text-white" />
                                </div>
                            )}
                            
                            {isVideoUrl(message.media_url) ? 
                                <video src={message.media_url} className="rounded-lg mb-2 max-w-full" /> : 
                                <img src={message.media_url} className="rounded-lg mb-2 max-w-full object-cover" alt="media" />
                            }
                        </div>
                        )}
                        
                        <p className="text-sm">{message.content}</p>
                        
                        {/* TIMESTAMP & STATUS */}
                        <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                        <span className="text-[9px]">{format(new Date(message.created_at), "HH:mm")}</span>
                        {isOwn && !isDeleted && (message.is_read ? <CheckCheck className="h-3 w-3 text-sky-400" /> : <Check className="h-3 w-3" />)}
                        </div>

                    </div>
                    </motion.div>
                </ContextMenuTrigger>
                
                {/* CONTEXT MENU (Long Press / Right Click) */}
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => setReplyingTo(message)}><Reply className="h-4 w-4 mr-2" /> Reply</ContextMenuItem>
                    <ContextMenuItem onClick={() => navigator.clipboard.writeText(message.content)}><Copy className="h-4 w-4 mr-2" /> Copy</ContextMenuItem>
                    {isOwn && !isDeleted && (
                        <>
                            <DropdownMenuSeparator />
                            <ContextMenuItem className="text-destructive" onClick={() => deleteMessage(message.id)}><Trash2 className="h-4 w-4 mr-2" /> Unsend (Delete)</ContextMenuItem>
                        </>
                    )}
                </ContextMenuContent>
            </ContextMenu>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* --- REPLY PREVIEW BOX --- */}
      {replyingTo && (
        <div className="px-4 py-2 bg-secondary/20 border-t border-border/50 flex justify-between items-center backdrop-blur-md">
            <div className="text-sm border-l-4 border-primary pl-2">
                <p className="text-xs font-bold text-primary">Replying to {replyingTo.sender_id === user?.id ? "Yourself" : otherUser.full_name}</p>
                <p className="text-xs opacity-70 truncate max-w-[200px]">{replyingTo.content}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {/* --- INPUT BOX --- */}
      <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-lg">
        {selectedMedia && (
          <div className="mb-2 relative inline-block">
            {selectedMedia.type === 'image' ? <img src={selectedMedia.preview} className="h-20 w-20 object-cover rounded-lg" /> : <video src={selectedMedia.preview} className="h-20 w-20 object-cover rounded-lg" />}
            <button onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,video/*" />
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Image className="h-5 w-5" /></Button>
          
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="rounded-full shrink-0"><Smile className="h-5 w-5" /></Button></PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => <button key={emoji} onClick={() => {setNewMessage(prev => prev + emoji); setShowEmojiPicker(false);}} className="text-xl hover:bg-secondary rounded p-1">{emoji}</button>)}
              </div>
            </PopoverContent>
          </Popover>

          <Input 
            placeholder="Type a message..." 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 bg-secondary/50 border-none rounded-full h-10 px-4 focus-visible:ring-1"
          />
          
          <Button 
            size="icon" 
            onClick={sendMessage} 
            disabled={(!newMessage.trim() && !selectedMedia) || sending || uploading} 
            className="rounded-full bg-primary shrink-0"
          >
            {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {viewingStoryUser && (
        <StoryViewer
            users={viewingStoryUser}
            initialUserIndex={0}
            onClose={() => setViewingStoryUser(null)}
            onRefresh={() => {}}
        />
      )}
    </div>
  );
}