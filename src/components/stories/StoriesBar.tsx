import { useState, useEffect } from "react";
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
  mentions?: string[];
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
    if (user) loadAllData();
  }, [user]);

  useEffect(() => {
    const channel = supabase.channel('stories-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => { loadAllData(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
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
    const { data: storiesData } = await supabase.from('stories').select('*').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true }); // Oldest first
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
        grouped.push({ userId, username: userProfile.username || 'Unknown', avatarUrl: userProfile.avatar_url, stories, isViewed: allViewed });
      }
    });

    if (user) {
      const own = grouped.find(g => g.userId === user.id);
      setOwnStories(own ? own.stories : []);
    }

    const others = grouped.filter(g => g.userId !== user?.id);
    others.sort((a, b) => {
        if (a.isViewed !== b.isViewed) return a.isViewed ? 1 : -1;
        const dateA = new Date(a.stories[a.stories.length-1].created_at).getTime();
        const dateB = new Date(b.stories[b.stories.length-1].created_at).getTime();
        return dateB - dateA; // Newest first
    });

    setUsersWithStories(others);
  };

  const handleOwnStoryClick = () => {
    if (ownStories.length > 0) {
      const ownUserData: UserWithStories = { userId: user!.id, username: profile?.username || 'You', avatarUrl: profile?.avatar_url || null, stories: ownStories, isViewed: true };
      setUsersWithStories(prev => [ownUserData, ...prev.filter(u => u.userId !== user!.id)]);
      setSelectedUserIndex(0);
    } else {
      setShowCreateModal(true);
    }
  };

  return (
    <>
      <div className="overflow-x-auto scrollbar-hide border-b border-border/30">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 px-4 py-4">
          {user && (
            <div className="relative shrink-0">
              <StoryRing user={{ username: "Your Story", avatar_url: profile?.avatar_url, full_name: null }} hasStory={ownStories.length > 0} isSeen={ownStories.length > 0} onClick={handleOwnStoryClick} />
              <button onClick={(e) => { e.stopPropagation(); setShowCreateModal(true); }} className="absolute bottom-6 right-0 rounded-full p-1 border-2 border-background bg-primary text-white"><Plus className="w-3 h-3" /></button>
            </div>
          )}
          {usersWithStories.map((u, i) => (
            <div key={u.userId} className="shrink-0">
              <StoryRing user={{ username: u.username, avatar_url: u.avatarUrl, full_name: null }} hasStory isSeen={u.isViewed} onClick={() => setSelectedUserIndex(i)} />
            </div>
          ))}
        </motion.div>
      </div>
      {selectedUserIndex !== null && <StoryViewer users={usersWithStories} initialUserIndex={selectedUserIndex} onClose={() => { setSelectedUserIndex(null); loadAllData(); }} onRefresh={loadAllData} />}
      <CreateStoryModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreated={loadAllData} />
    </>
  );
}