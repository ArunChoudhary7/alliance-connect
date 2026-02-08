import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Settings, Link as LinkIcon, MapPin, Calendar, LogOut, Edit2, 
  Sparkles, Bookmark, Grid, Lock, UserPlus, Clock, Check, 
  MessageCircle, Loader2, Cpu, GraduationCap, Code2 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, getUserPosts, getFollowerCount, getFollowingCount, signOut, getSavedPosts, getProfileByUsername, isFollowing } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/feed/PostCard";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { FollowersModal } from "@/components/profile/FollowersModal";
import { ProfileSkeleton } from "@/components/ui/skeleton-loader";
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

  // FIXED: Missing handleProfileUpdated function
  const handleProfileUpdated = async () => {
    setLoading(true);
    await refreshProfile();
    if (user) {
      const { data } = await getProfile(user.id);
      if (data) setProfile(data as Profile);
    }
    setShowEditModal(false);
    setLoading(false);
  };

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
        const [followersResult, followingResult, postsResult] = await Promise.all([
          getFollowerCount(targetProfile.user_id),
          getFollowingCount(targetProfile.user_id),
          getUserPosts(targetProfile.user_id, POSTS_PER_PAGE, 0)
        ]);
        
        if (postsResult.data) {
          setPosts(postsResult.data as unknown as Post[]);
          if (postsResult.data.length < POSTS_PER_PAGE) setHasMorePosts(false);
        }
        
        setFollowerCount(followersResult.count || 0);
        setFollowingCount(followingResult.count || 0);

        if (!isOwnProfile && user) {
          const { isFollowing: isFollowed } = await isFollowing(user.id, targetProfile.user_id);
          if (isFollowed) setFollowStatus('following');
          else {
            const { data: pReq } = await supabase.from('follow_requests').select('id').eq('requester_id', user.id).eq('target_id', targetProfile.user_id).eq('status', 'pending').maybeSingle();
            setFollowStatus(pReq ? 'requested' : 'none');
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
    const { data } = await getUserPosts(profile.user_id, POSTS_PER_PAGE, nextPage * POSTS_PER_PAGE);
    if (data) {
      setPosts(prev => [...prev, ...data as unknown as Post[]]);
      setPostsPage(nextPage);
      if (data.length < POSTS_PER_PAGE) setHasMorePosts(false);
    }
    setLoadingMorePosts(false);
  };

  const handleFollow = async () => {
    if (!user || !profile || followLoading) return;
    setFollowLoading(true);
    const prevStatus = followStatus;
    
    try {
      if (followStatus === 'following') {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.user_id);
        setFollowStatus('none'); setFollowerCount(c => c - 1);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.user_id });
        setFollowStatus('following'); setFollowerCount(c => c + 1);
      }
    } catch (e) { toast.error("Update failed"); setFollowStatus(prevStatus); }
    finally { setFollowLoading(false); }
  };

  if (loading || authLoading) return <AppLayout><ProfileSkeleton /></AppLayout>;
  if (!profile) return <AppLayout><div className="text-center py-20 uppercase font-black italic opacity-20">Profile Not Found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-20">
        {/* COVER IMAGE */}
        <div className="relative h-48 md:h-64 bg-secondary/30 rounded-b-[3rem] overflow-hidden group">
          {profile.cover_url ? (
            <img src={profile.cover_url} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-accent/20" />
          )}
          {isOwnProfile && (
            <div className="absolute top-6 right-6 flex gap-2">
              <Button size="icon" variant="secondary" className="rounded-full glass-card border-none hover:scale-110 transition-transform" onClick={() => setShowEditModal(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" className="rounded-full glass-card border-none hover:scale-110 transition-transform" onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* IDENTITY */}
        <div className="px-6 -mt-16 relative z-10">
          <div className="flex items-end justify-between gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32 border-[6px] border-background shadow-2xl">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-primary text-white text-3xl font-black italic uppercase">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex gap-2 mb-2">
              {isOwnProfile ? (
                <Button variant="secondary" className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-11 px-6 shadow-sm" onClick={async () => { await signOut(); navigate("/auth"); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button className={`rounded-2xl font-black uppercase text-[10px] tracking-widest h-11 px-8 shadow-lg shadow-primary/20 ${followStatus === 'following' ? 'bg-secondary text-foreground' : 'bg-gradient-primary text-white'}`} onClick={handleFollow}>
                    {followStatus === 'following' ? 'Following' : 'Follow'}
                  </Button>
                  <Button size="icon" variant="secondary" className="rounded-2xl h-11 w-11" onClick={() => navigate(`/messages?chat=${profile.user_id}`)}>
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none">{profile.full_name}</h1>
              {profile.total_aura && profile.total_aura > 100 && <Check className="bg-primary text-white h-5 w-5 rounded-full p-1" />}
            </div>
            <p className="text-sm font-black text-primary uppercase tracking-widest">@{profile.username}</p>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {profile.department && (
                <Badge variant="secondary" className="rounded-lg py-1 px-3 bg-secondary/50 border-none flex gap-2 text-[10px] font-black uppercase tracking-widest">
                  <GraduationCap className="h-3 w-3" /> {profile.department}
                </Badge>
              )}
              {profile.year && (
                <Badge variant="secondary" className="rounded-lg py-1 px-3 bg-secondary/50 border-none flex gap-2 text-[10px] font-black uppercase tracking-widest">
                  <Clock className="h-3 w-3" /> Year {profile.year}
                </Badge>
              )}
            </div>

            {profile.bio && <p className="mt-4 text-sm font-medium leading-relaxed max-w-md opacity-80">{profile.bio}</p>}
            
            {profile.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.skills.map((skill) => (
                  <div key={skill} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-primary/20">
                    <Code2 className="h-3 w-3" /> {skill}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-8 py-6 border-y border-white/5 text-center">
            <div className="flex-1 group cursor-pointer">
              <p className="text-xl font-black italic leading-none">{posts.length}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1 group-hover:text-primary transition-colors">Posts</p>
            </div>
            <div className="flex-1 group cursor-pointer" onClick={() => { setFollowersModalTab("followers"); setShowFollowersModal(true); }}>
              <p className="text-xl font-black italic leading-none">{followerCount}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1 group-hover:text-primary transition-colors">Followers</p>
            </div>
            <div className="flex-1 group cursor-pointer" onClick={() => { setFollowersModalTab("following"); setShowFollowersModal(true); }}>
              <p className="text-xl font-black italic leading-none">{followingCount}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1 group-hover:text-primary transition-colors">Following</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <p className="text-xl font-black italic leading-none text-primary">{profile.total_aura || 0}</p>
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Aura</p>
            </div>
          </div>
        </div>

        {/* TABS CONTENT */}
        <div className="px-4 mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 bg-secondary/20 h-12 p-1 rounded-2xl">
              <TabsTrigger value="posts" className="rounded-xl font-black uppercase text-[10px] tracking-widest">
                <Grid className="h-3.5 w-3.5 mr-2" /> Posts
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger value="saved" className="rounded-xl font-black uppercase text-[10px] tracking-widest">
                  <Bookmark className="h-3.5 w-3.5 mr-2" /> Saved
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="posts" className="mt-6 space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <Grid className="h-12 w-12 mx-auto mb-4" />
                  <p className="font-black uppercase text-[10px] tracking-widest">No Posts Yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {posts.map(p => <PostCard key={p.id} post={p} />)}
                </div>
              )}
              {hasMorePosts && (
                <Button variant="ghost" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs opacity-50 hover:opacity-100" onClick={loadMorePosts} disabled={loadingMorePosts}>
                  {loadingMorePosts ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More Activity"}
                </Button>
              )}
            </TabsContent>

            {isOwnProfile && (
              <TabsContent value="saved" className="mt-6">
                <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
                  {savedPosts.map(p => (
                    <div key={p.id} className="aspect-square bg-secondary/50 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(`/post/${p.id}`)}>
                      {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center italic font-black text-[8px] uppercase">Text Post</div>}
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
      
      <EditProfileModal open={showEditModal} onOpenChange={setShowEditModal} onProfileUpdated={handleProfileUpdated} />
      {profile && (
        <FollowersModal 
          open={showFollowersModal} 
          onOpenChange={setShowFollowersModal} 
          userId={profile.user_id} 
          initialTab={followersModalTab} 
          username={profile.username || ""} 
          isOwnProfile={isOwnProfile} 
        />
      )}
    </AppLayout>
  );
}