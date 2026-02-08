import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Edit, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function ConversationList({ onSelectConversation, selectedId }: any) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
      if (user) {
          fetchConversations();
          const cleanup = setupRealtime();
          return cleanup;
      } 
  }, [user]);

  const fetchConversations = async () => {
    // 1. Fetch Conversations sorted by newest first
    const { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user?.id},participant_2.eq.${user?.id}`)
        .order("last_message_at", { ascending: false });

    if (!convos) return setLoading(false);

    // 2. Fetch Profiles for the "Other User"
    const otherUserIds = convos.map(c => c.participant_1 === user?.id ? c.participant_2 : c.participant_1);
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, full_name, avatar_url").in("user_id", otherUserIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // 3. Fetch Unread Counts for EACH conversation
    const { data: unreadData } = await supabase
        .from('direct_messages')
        .select('conversation_id')
        .eq('is_read', false)
        .neq('sender_id', user?.id); // Only count messages sent TO me

    // Count unreads per conversation
    const unreadCounts: Record<string, number> = {};
    unreadData?.forEach((msg: any) => {
        unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
    });

    setConversations(convos.map(c => ({
      ...c,
      other_user: profileMap.get(c.participant_1 === user?.id ? c.participant_2 : c.participant_1) || { full_name: 'AU User', username: 'user' },
      unread_count: unreadCounts[c.id] || 0
    })));
    setLoading(false);
  };

  // Real-time listener to update list when new messages arrive
  const setupRealtime = () => {
      const channel = supabase.channel('conversation-list-update')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
              fetchConversations();
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, () => {
              fetchConversations(); // Update unread counts
          })
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="h-full overflow-y-auto flex-1 custom-scrollbar">
      {conversations.length === 0 ? (
          <div className="text-center p-8 opacity-50 text-sm">No messages yet. Start a conversation!</div>
      ) : (
          conversations.map((c) => (
            <button 
                key={c.id} 
                onClick={() => onSelectConversation(c)} 
                className={`w-full p-4 flex gap-3 hover:bg-secondary/30 border-b border-border/30 transition-colors ${selectedId === c.id ? 'bg-secondary/50' : ''}`}
            >
            <div className="relative">
                <Avatar><AvatarImage src={c.other_user.avatar_url} /><AvatarFallback>{getInitials(c.other_user.full_name)}</AvatarFallback></Avatar>
                {/* Online Indicator (Optional - simplistic version) */}
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            
            <div className="text-left flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <p className={`text-sm truncate ${c.unread_count > 0 ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>
                        {c.other_user.full_name}
                    </p>
                    {c.last_message_at && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false }).replace('about ', '')}
                        </span>
                    )}
                </div>
                
                <div className="flex justify-between items-center mt-0.5">
                    <p className={`text-xs truncate max-w-[80%] ${c.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {c.last_message || "Sent an attachment"}
                    </p>
                    
                    {c.unread_count > 0 && (
                        <span className="h-5 w-5 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                            {c.unread_count}
                        </span>
                    )}
                </div>
            </div>
            </button>
        ))
      )}
    </div>
  );
}