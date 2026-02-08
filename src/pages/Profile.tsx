import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Settings, Link as LinkIcon, MapPin, Calendar, LogOut, Edit2, Sparkles, Bookmark, Grid, Lock, UserPlus, Clock, Check, MessageCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, getUserPosts, getFollowerCount, getFollowingCount, signOut, getSavedPosts, getProfileByUsername, isFollowing } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/feed/PostCard";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { FollowersModal } from "@/components/profile/FollowersModal";
import { ProfileSkeleton } from "@/components/ui/skeleton-loader";
import { MomentHighlights } from "@/components/stories/MomentHighlights";
import { format } from "date-fns";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  bio_link: string | null;
  department: string | null;
  year: string | null;
  skills: string[] | null;
  total_aura: number | null;
  is_private: boolean | null;
  created_at: string;
}

// FIXED: Added video_url to the interface so videos render
interface Post {
  id: string;
  user_id: string;
  content: string | null;
  images: string[] | null;
  video_url: string | null; 
  aura_count: number | null;
  comments_count: number | null;
  hashtags: string[] | null;
  created_at: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

type FollowStatus = 'none' | 'following' | 'requested';

export default function Profile() {
  const { username } = useParams();
  const { user, profile: currentUserProfile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");

  const [postsPage, setPostsPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const POSTS_PER_PAGE = 12;

  const isOwnProfile = !username || (currentUserProfile?.username === username);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      if (!user) return;
      
      let targetProfile: Profile | null = null;
      if (isOwnProfile) {
        targetProfile = currentUserProfile as Profile | null;
      } else if (username) {
        const { data } = await getProfileByUsername(username);
        targetProfile = data as Profile | null;
      }
      
      setProfile(targetProfile);
      
      if (targetProfile) {
        setPostsPage(0);
        setHasMorePosts(true);

        const [followersResult, followingResult] = await Promise.all([
          getFollowerCount(targetProfile.user_id),
          getFollowingCount(targetProfile.user_id),
        ]);
        
        const postsResult = await getUserPosts(targetProfile.user_id, POSTS_PER_PAGE, 0);
        
        if (postsResult.data) {
          setPosts(postsResult.data as unknown as Post[]);
          if (postsResult.data.length < POSTS_PER_PAGE) setHasMorePosts(false);
        }
        
        setFollowerCount(followersResult.count || 0);
        setFollowingCount(followingResult.count || 0);

        if (!isOwnProfile && user) {
          const { isFollowing: isFollowed } = await isFollowing(user.id, targetProfile.user_id);
          if (isFollowed) {
            setFollowStatus('following');
          } else {
            const { data: pendingRequest } = await supabase
              .from('follow_requests')
              .select('id')
              .eq('requester_id', user.id)
              .eq('target_id', targetProfile.user_id)
              .eq('status', 'pending')
              .maybeSingle();
            setFollowStatus(pendingRequest ? 'requested' : 'none');
          }
        }

        if (isOwnProfile) {
          const { data: saved } = await getSavedPosts(user.id);
          if (saved) setSavedPosts(saved as Post[]);
        }
      }
      setLoading(false);
    };

    if (!authLoading) fetchData();
  }, [user, authLoading, currentUserProfile, username, isOwnProfile, navigate]);

  const loadMorePosts = async () => {
    if (!profile || loadingMorePosts) return;
    setLoadingMorePosts(true);
    const nextPage = postsPage + 1;
    const offset = nextPage * POSTS_PER_PAGE;
    const { data } = await getUserPosts(profile.user_id, POSTS_PER_PAGE, offset);
    if (data) {
      setPosts(prev => [...prev, ...data as unknown as Post[]]);
      setPostsPage(nextPage);
      if (data.length < POSTS_PER_PAGE) setHasMorePosts(false);
    }
    setLoadingMorePosts(false);
  };

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  const handleFollow = async () => {
    if (!user || !profile) return;
    const previousStatus = followStatus;
    const previousCount = followerCount;

    if (followStatus === 'following') {
      setFollowStatus('none'); setFollowerCount(prev => prev - 1); toast.success('Unfollowed');
    } else if (followStatus === 'requested') {
      setFollowStatus('none'); toast.success('Request cancelled');
    } else {
      if (profile.is_private) { setFollowStatus('requested'); toast.success('Follow request sent'); } 
      else { setFollowStatus('following'); setFollowerCount(prev => prev + 1); toast.success('Following!'); }
    }

    setFollowLoading(true);
    try {
      if (previousStatus === 'following') await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.user_id);
      else if (previousStatus === 'requested') await supabase.from('follow_requests').delete().eq('requester_id', user.id).eq('target_id', profile.user_id);
      else {
        if (profile.is_private) await supabase.from('follow_requests').insert({ requester_id: user.id, target_id: profile.user_id, status: 'pending' });
        else await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.user_id });
      }
    } catch (error) { setFollowStatus(previousStatus); setFollowerCount(previousCount); toast.error("Action failed"); } 
    finally { setFollowLoading(false); }
  };

  const handleMessage = async () => {
    if (!user || !profile) return;
    const { data: existing } = await supabase.from('conversations').select('id').or(`and(participant_1.eq.${user.id},participant_2.eq.${profile.user_id}),and(participant_1.eq.${profile.user_id},participant_2.eq.${user.id})`).maybeSingle();
    if (existing) navigate(`/messages?chat=${existing.id}`);
    else {
      const { data: newConvo } = await supabase.from('conversations').insert({ participant_1: user.id, participant_2: profile.user_id }).select('id').single();
      if (newConvo) navigate(`/messages?chat=${newConvo.id}`);
    }
  };

  const handleProfileUpdated = async () => {
    await refreshProfile(); setShowEditModal(false);
    const { data } = await getProfile(user!.id);
    if (data) setProfile(data as Profile);
  };

  if (loading || authLoading) return <AppLayout><ProfileSkeleton /></AppLayout>;
  if (!profile) return <AppLayout><div className="text-center py-20">Profile not found</div></AppLayout>;

  const isPrivateAndNotFollowing = !isOwnProfile && profile.is_private && followStatus !== 'following';

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        {/* Cover Image */}
        <div className="relative h-32 bg-gradient-primary rounded-b-3xl">
          {profile.cover_url && <img src={profile.cover_url} className="w-full h-full object-cover rounded-b-3xl" alt="Cover" />}
          {isOwnProfile && <div className="absolute top-4 right-4 flex gap-2"><Button size="icon" variant="secondary" className="rounded-full h-9 w-9 glass-card" onClick={() => setShowEditModal(true)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="secondary" className="rounded-full h-9 w-9 glass-card" onClick={() => navigate('/settings')}><Settings className="h-4 w-4" /></Button></div>}
        </div>

        {/* Profile Info */}
        <div className="px-4 -mt-12">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-background">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-primary text-white text-2xl font-bold">{getInitials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 pb-2">
              {isOwnProfile ? <Button variant="secondary" size="sm" className="rounded-full" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-2" /> Sign Out</Button> : <div className="flex gap-2"><Button size="sm" className={`rounded-full ${followStatus === 'following' ? 'bg-secondary text-foreground' : 'bg-gradient-primary'}`} onClick={handleFollow}>{followStatus === 'following' ? 'Following' : 'Follow'}</Button><Button size="icon" variant="secondary" className="rounded-full" onClick={handleMessage}><MessageCircle className="h-4 w-4" /></Button></div>}
            </div>
          </div>
          <div className="mt-4"><h1 className="text-xl font-bold">{profile.full_name}</h1><p className="text-muted-foreground text-sm">@{profile.username}</p>{profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}</div>
          
          <div className="flex items-center gap-6 mt-6 py-4 border-y border-border/50 text-center">
            <div className="flex-1"><p className="text-lg font-bold">{posts.length}</p><p className="text-xs text-muted-foreground">Posts</p></div>
            <div className="flex-1 cursor-pointer" onClick={() => { setFollowersModalTab("followers"); setShowFollowersModal(true); }}><p className="text-lg font-bold">{followerCount}</p><p className="text-xs text-muted-foreground">Followers</p></div>
            <div className="flex-1 cursor-pointer" onClick={() => { setFollowersModalTab("following"); setShowFollowersModal(true); }}><p className="text-lg font-bold">{followingCount}</p><p className="text-xs text-muted-foreground">Following</p></div>
            <div className="flex-1"><div className="flex items-center justify-center gap-1"><Sparkles className="h-4 w-4 text-accent" /><p className="text-lg font-bold gradient-text">{profile.total_aura || 0}</p></div><p className="text-xs text-muted-foreground">Aura</p></div>
          </div>
        </div>

        {/* Content Tabs */}
        {isPrivateAndNotFollowing ? <div className="text-center py-20"><Lock className="mx-auto mb-2 opacity-20" /><p>This Account is Private</p></div> : (
          <div className="px-4 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 bg-secondary/30 mb-4">
                <TabsTrigger value="posts"><Grid className="h-4 w-4 mr-2" /> Posts</TabsTrigger>
                {isOwnProfile && <TabsTrigger value="saved"><Bookmark className="h-4 w-4 mr-2" /> Saved</TabsTrigger>}
              </TabsList>
              <TabsContent value="posts" className="space-y-4">
                {posts.length === 0 ? <p className="text-center py-10 text-muted-foreground">No posts yet</p> : posts.map(p => <PostCard key={p.id} post={p} />)}
                {hasMorePosts && <Button variant="outline" className="w-full rounded-full" onClick={loadMorePosts} disabled={loadingMorePosts}>Load More</Button>}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      <EditProfileModal open={showEditModal} onOpenChange={setShowEditModal} onProfileUpdated={handleProfileUpdated} />
      <FollowersModal open={showFollowersModal} onOpenChange={setShowFollowersModal} userId={profile.user_id} initialTab={followersModalTab} username={profile.username || ""} isOwnProfile={isOwnProfile} />
    </AppLayout>
  );
}