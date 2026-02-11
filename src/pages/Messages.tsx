import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatView } from "@/components/messages/ChatView";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
      {/* FIXED: Removed 'fixed inset-0'. Now uses standard height so your bottom nav stays visible. */}
      <div className="w-full h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex overflow-hidden bg-background">
        
        {(!isMobile || !selectedConversation) && (
          <div className={`${isMobile ? 'w-full' : 'w-96'} border-r border-white/5 flex flex-col bg-background h-full`}>
            <ConversationList key={refreshKey} onSelectConversation={handleSelectConversation} selectedId={selectedConversation?.id} />
          </div>
        )}

        {selectedConversation && (
          <div className="flex-1 bg-background relative h-full">
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