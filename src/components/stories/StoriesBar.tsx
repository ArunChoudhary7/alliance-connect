import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { StoryRing } from "./StoryRing";
import { StoryViewer } from "./StoryViewer";
import { CreateStoryModal } from "./CreateStoryModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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

interface UserWithStories {
  userId: string;
  username: string;
  avatarUrl: string | null;
  stories: Story[];
  isViewed?: boolean;
}

export function StoriesBar() {
  const { user, profile } = useAuth();
  const [usersWithStories, setUsersWithStories] = useState<UserWithStories[]>([]);
  const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ownStories, setOwnStories] = useState<Story[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  useEffect(() => {
    const channel = supabase
      .channel('stories-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        loadAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    await Promise.all([fetchViewedStories(), fetchStories()]);
  };

  const fetchViewedStories = async () => {
    if (!user) return;
    const { data } = await supabase.from('story_views').select('story_id').eq('viewer_id', user.id);
    if (data) {
      const ids = new Set(data.map(v => v.story_id));
      setViewedStoryIds(ids);
      return ids;
    }
    return new Set<string>();
  };

  const fetchStories = async () => {
    const { data: storiesData } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!storiesData) return;

    const userIds = [...new Set(storiesData.map(s => s.user_id))];
    const { data: profilesData } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds);
    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

    const storiesByUser = new Map<string, Story[]>();
    storiesData.forEach(story => {
      const existing = storiesByUser.get(story.user_id) || [];
      existing.push(story);
      storiesByUser.set(story.user_id, existing);
    });

    const { data: views } = await supabase.from('story_views').select('story_id').eq('viewer_id', user!.id);
    const currentViewedIds = new Set(views?.map(v => v.story_id) || []);
    setViewedStoryIds(currentViewedIds);

    const grouped: UserWithStories[] = [];
    storiesByUser.forEach((stories, userId) => {
      const userProfile = profilesMap.get(userId);
      if (userProfile) {
        const allViewed = stories.every(s => currentViewedIds.has(s.id));
        grouped.push({
          userId,
          username: userProfile.username || 'Unknown',
          avatarUrl: userProfile.avatar_url,
          stories,
          isViewed: allViewed
        });
      }
    });

    grouped.sort((a, b) => {
      if (a.isViewed !== b.isViewed) return a.isViewed ? 1 : -1;
      return new Date(b.stories[0].created_at).getTime() - new Date(a.stories[0].created_at).getTime();
    });

    if (user) {
      const own = grouped.find(g => g.userId === user.id);
      setOwnStories(own ? own.stories : []);
    }

    setUsersWithStories(grouped.filter(g => g.userId !== user?.id));
  };

  const handleOwnStoryClick = () => {
    if (ownStories.length > 0) {
      const ownUserData: UserWithStories = {
        userId: user!.id,
        username: profile?.username || 'You',
        avatarUrl: profile?.avatar_url || null,
        stories: ownStories,
        isViewed: true
      };
      // We temporarily inject own story to the viewer users array for display
      setUsersWithStories(prev => [ownUserData, ...prev.filter(u => u.userId !== user!.id)]);
      setSelectedUserIndex(0);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleAddStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCreateModal(true);
  };

  const handleStoryClose = async () => {
    setSelectedUserIndex(null);
    await loadAllData();
  };

  return (
    <>
      <div className="overflow-x-auto scrollbar-hide border-b border-border/30">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 px-4 py-4">
          
          {/* Own Story with Plus Button Always Available */}
          {user && (
            <div className="relative shrink-0">
              <StoryRing
                user={{
                  username: "Your Story",
                  avatar_url: profile?.avatar_url || null,
                  full_name: profile?.full_name || null
                }}
                hasStory={ownStories.length > 0}
                isSeen={ownStories.length > 0} 
                onClick={handleOwnStoryClick}
              />
              
              {/* Blue Plus Button Overlay */}
              <button 
                onClick={handleAddStory} 
                className={`absolute bottom-6 right-0 rounded-full p-1 border-2 border-background hover:scale-110 transition-transform ${
                  ownStories.length > 0 
                  ? "bg-secondary text-primary" 
                  : "bg-primary text-white"
                }`}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Other Users */}
          {usersWithStories.map((userWithStories, index) => (
            <div key={userWithStories.userId} className="shrink-0">
              <StoryRing
                user={{
                  username: userWithStories.username,
                  avatar_url: userWithStories.avatarUrl,
                  full_name: null
                }}
                hasStory
                isSeen={userWithStories.isViewed}
                onClick={() => setSelectedUserIndex(index)}
              />
            </div>
          ))}

          {/* Fallback for empty state */}
          {usersWithStories.length === 0 && ownStories.length === 0 && (
            <div className="flex items-center justify-center px-4 py-2 w-full text-center">
              <p className="text-xs text-muted-foreground">Tap + to add a moment</p>
            </div>
          )}
        </motion.div>
      </div>

      {selectedUserIndex !== null && (
        <StoryViewer
          users={usersWithStories}
          initialUserIndex={selectedUserIndex}
          onClose={handleStoryClose}
          onRefresh={loadAllData}
        />
      )}

      <CreateStoryModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={() => { loadAllData(); setShowCreateModal(false); }}
      />
    </>
  );
}