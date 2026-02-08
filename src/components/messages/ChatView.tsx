import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Image, Smile, MoreVertical, Loader2, Check, CheckCheck, X, Play, Type } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isYesterday } from "date-fns";
import { Link } from "react-router-dom";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getInitials } from "@/lib/utils";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  message_type: string;
  is_read: boolean;
  created_at: string;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; preview: string; type: 'image' | 'video' } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [conversationId]);

  useEffect(() => {
    if (user) markMessagesAsRead();
  }, [conversationId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase.from("direct_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
    await supabase.from("direct_messages").update({ is_read: true }).eq("conversation_id", conversationId).neq("sender_id", user.id).eq("is_read", false);
    if (onMessageRead) onMessageRead();
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase.channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          if (payload.new.sender_id !== user?.id) markMessagesAsRead();
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
        message_type: type
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

  const isVideoUrl = (url: string | null) => url?.match(/\.(mp4|webm|ogg|mov)$/i);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* HEADER */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-background/80 backdrop-blur-lg">
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
        <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          return (
            <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isOwn ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-secondary-foreground rounded-bl-none"}`}>
                {message.media_url && (
                  isVideoUrl(message.media_url) ? 
                  <video src={message.media_url} controls className="rounded-lg mb-2 max-w-full" /> : 
                  <img src={message.media_url} className="rounded-lg mb-2 max-w-full" alt="media" />
                )}
                <p className="text-sm">{message.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                  <span className="text-[9px]">{format(new Date(message.created_at), "HH:mm")}</span>
                  {isOwn && (message.is_read ? <CheckCheck className="h-3 w-3 text-sky-400" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* --- REPLY BOX (RESTORED) --- */}
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
    </div>
  );
}