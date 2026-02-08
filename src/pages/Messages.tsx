import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatView } from "@/components/messages/ChatView";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// We use 'export default' here to match line 17 of your App.tsx
export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0); 
  const isMobile = useIsMobile();

  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && user) {
      loadConversationById(chatId);
    }
  }, [searchParams, user]);

  const loadConversationById = async (conversationId: string) => {
    if (!user) return;
    const { data: convo } = await supabase.from('conversations').select('*').eq('id', conversationId).single();
    if (convo) {
      const otherUserId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;
      const { data: profile } = await supabase.from('profiles').select('user_id, username, full_name, avatar_url').eq('user_id', otherUserId).single();
      
      setSelectedConversation({
        ...convo,
        unread_count: 0,
        other_user: profile || { user_id: otherUserId, username: 'user', full_name: 'AU User' },
      });
    }
  };

  const handleSelectConversation = (conversation: any) => {
    setSelectedConversation({ ...conversation, unread_count: 0 });
    setRefreshKey(prev => prev + 1);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex border border-border/50 rounded-2xl overflow-hidden bg-background/50">
        {(!isMobile || !selectedConversation) && (
          <div className={`${isMobile ? 'w-full' : 'w-80'} border-r border-border/50 flex flex-col`}>
            <div className="p-4 border-b border-border/50"><h1 className="text-xl font-bold">Messages</h1></div>
            <ConversationList key={refreshKey} onSelectConversation={handleSelectConversation} selectedId={selectedConversation?.id} />
          </div>
        )}
        {selectedConversation && (
          <div className="flex-1">
            <ChatView 
              conversationId={selectedConversation.id} 
              otherUser={selectedConversation.other_user} 
              onBack={() => setSelectedConversation(null)} 
              onMessageRead={() => setRefreshKey(prev => prev + 1)} 
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}