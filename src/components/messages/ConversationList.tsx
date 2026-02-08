import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Edit, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";

export function ConversationList({ onSelectConversation, selectedId }: any) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchConversations(); }, [user]);

  const fetchConversations = async () => {
    const { data: convos } = await supabase.from("conversations").select("*").or(`participant_1.eq.${user?.id},participant_2.eq.${user?.id}`).order("last_message_at", { ascending: false });
    if (!convos) return setLoading(false);

    const otherUserIds = convos.map(c => c.participant_1 === user?.id ? c.participant_2 : c.participant_1);
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, full_name, avatar_url").in("user_id", otherUserIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setConversations(convos.map(c => ({
      ...c,
      other_user: profileMap.get(c.participant_1 === user?.id ? c.participant_2 : c.participant_1) || { full_name: 'AU User', username: 'user' }
    })));
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="h-full overflow-y-auto flex-1">
      {conversations.map((c) => (
        <button key={c.id} onClick={() => onSelectConversation(c)} className={`w-full p-4 flex gap-3 hover:bg-secondary/30 border-b border-border/30 ${selectedId === c.id ? 'bg-secondary/50' : ''}`}>
          <Avatar><AvatarImage src={c.other_user.avatar_url} /><AvatarFallback>{getInitials(c.other_user.full_name)}</AvatarFallback></Avatar>
          <div className="text-left flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{c.other_user.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">View messages</p>
          </div>
        </button>
      ))}
    </div>
  );
}