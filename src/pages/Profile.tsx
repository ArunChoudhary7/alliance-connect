import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Settings, Edit2, Sparkles, Grid, Lock, MessageCircle, Check, Link as LinkIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, getUserPosts, getFollowerCount, getFollowingCount, getProfileByUsername, isFollowing } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/feed/PostCard";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { FollowersModal } from "@/components/profile/FollowersModal";
import { ProfileSkeleton } from "@/components/ui/skeleton-loader";
import { MomentHighlights } from "@/components/stories/MomentHighlights";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { motion } from "framer-motion";

// --- AURA RING COMPONENT ---
const AuraProgressRing = ({ aura, size = 152, stroke = 6 }: { aura: number, size?: number, stroke?: number }) => {
  const radius = (size / 2) - stroke;
  const circumference = radius * 2 * Math.PI;
  const progress = (aura % 100) / 100;
  const offset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90">
        <circle
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          stroke="var(--theme-accent)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="drop-shadow-[0_0_8px_var(--theme-accent)]"
        />
      </svg>
      <div className="absolute -top-1 -right-1 bg-black border border-white/10 px-2 py-0.5 rounded-full z-20">
        <p className="text-[10px] font-black theme-text">LVL {Math.floor(aura / 100) + 1}</p>
      </div>
    </div>
  );
};

export default function Profile() {
  const { username } = useParams();
  const { user, profile: currentUserProfile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  // State definitions
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [followStatus, setFollowStatus] = useState<any>('none');
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [isPrivateLocked, setIsPrivateLocked] = useState(false); 

  const isOwnProfile = !username || (currentUserProfile?.username === username);
  const activeTheme = profile?.theme_config?.background || "aurora-violet";

  // Global Theme Sync
  useEffect(() => {
    if (activeTheme) {
      document.documentElement.setAttribute('data-theme', activeTheme);
    }
  }, [activeTheme]);

  const handleProfileUpdated = async () => {
    setLoading(true);
    await refreshProfile();
    if (user) {
      const { data } = await getProfile(user.id);
      setProfile(data);
    }
    setShowEditModal(false);
    setLoading(false);
    toast.success("Profile Updated");
  };

  const handleFollow = async () => {
    if (!user || !profile || followLoading) return;
    setFollowLoading(true);
    const prevStatus = followStatus;
    try {
      if (followStatus === 'following') {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.user_id);
        setFollowStatus('none');
        setFollowerCount(c => c - 1);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.user_id });
        setFollowStatus('following');
        setFollowerCount(c => c + 1);
      }
    } catch (e) {
      toast.error("Update failed");
      setFollowStatus(prevStatus);
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    let targetProfile: any = null;
    
    if (isOwnProfile) {
      targetProfile = currentUserProfile;
    } else if (username) {
      const { data } = await getProfileByUsername(username);
      targetProfile = data;
    }
    
    setProfile(targetProfile);

    if (targetProfile) {
      let isFollowed = false;
      if (!isOwnProfile) {
        const { isFollowing: fStatus } = await isFollowing(user.id, targetProfile.user_id);
        isFollowed = fStatus;
        if (isFollowed) setFollowStatus('following');
        else {
          const { data: pReq } = await supabase.from('follow_requests').select('id').eq('requester_id', user.id).eq('target_id', targetProfile.user_id).eq('status', 'pending').maybeSingle();
          setFollowStatus(pReq ? 'requested' : 'none');
        }
        const { data: mutualData } = await supabase.rpc('get_mutual_follows', { viewer_id: user.id, target_id: targetProfile.user_id });
        setMutuals(mutualData || []);
      }

      if (targetProfile.is_private && !isOwnProfile && !isFollowed) {
        setIsPrivateLocked(true);
        setLoading(false);
        return; 
      }

      const [followersResult, followingResult, postsResult] = await Promise.all([
        getFollowerCount(targetProfile.user_id),
        getFollowingCount(targetProfile.user_id),
        getUserPosts(targetProfile.user_id, 12, 0)
      ]);
      
      setPosts(postsResult.data || []);
      setFollowerCount(followersResult.count || 0);
      setFollowingCount(followingResult.count || 0);
      setIsPrivateLocked(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!authLoading) fetchData();
  }, [user, authLoading, currentUserProfile, username, isOwnProfile]);

  if (loading || authLoading) return <AppLayout><ProfileSkeleton /></AppLayout>;
  if (!profile) return <AppLayout><div className="text-center py-20 uppercase font-black italic opacity-20">Profile Not Found</div></AppLayout>;

  return (
    <AppLayout>
      <div 
        className="max-w-2xl mx-auto pb-20 min-h-screen profile-theme-container transition-all duration-700" 
        data-theme={activeTheme}
      >
        {/* HEADER / COVER */}
        <div className="relative h-48 md:h-64 rounded-b-[3rem] overflow-hidden group">
          {profile.cover_url ? (
            <img src={profile.cover_url} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-white/5 backdrop-blur-md" />
          )}
          {isOwnProfile && (
            <div className="absolute top-6 right-6 flex gap-2">
              <Button size="icon" variant="secondary" className="rounded-full glass-card border-none hover:scale-110 transition-transform" onClick={() => setShowEditModal(true)}>
                <Edit2 className="h-4 w-4 text-white" />
              </Button>
              <Button size="icon" variant="secondary" className="rounded-full glass-card border-none hover:scale-110 transition-transform" onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 text-white" />
              </Button>
            </div>
          )}
        </div>

        {/* INFO SECTION */}
        <div className="px-6 -mt-20 relative z-10">
          <div className="flex items-end justify-between gap-4">
            <div className="relative flex items-center justify-center group">
              <AuraProgressRing aura={profile.total_aura || 0} size={152} stroke={6} />
              <div className="absolute p-1 rounded-full overflow-hidden">
                <Avatar className="h-32 w-32 border-[4px] border-black shadow-2xl transition-transform duration-500 group-hover:scale-95">
                  <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                  <AvatarFallback className="text-white text-3xl font-black italic uppercase theme-bg">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {!isOwnProfile && (
                <div className="flex gap-2">
                  <Button className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-11 px-8 shadow-lg theme-bg text-white hover:opacity-90 transition-opacity" onClick={handleFollow}>
                    {followStatus === 'following' ? 'Following' : followStatus === 'requested' ? 'Requested' : 'Follow'}
                  </Button>
                  <Button size="icon" variant="secondary" className="rounded-2xl h-11 w-11 bg-white/10 text-white" onClick={() => navigate(`/messages?chat=${profile.user_id}`)}>
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none theme-text drop-shadow-sm">{profile.full_name}</h1>
              {profile.total_aura > 100 && <Check className="text-white h-5 w-5 rounded-full p-1 theme-bg" />}
            </div>
            <p className="text-sm font-bold text-white/50 uppercase tracking-widest">@{profile.username}</p>
            {!isOwnProfile && mutuals.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
                <div className="flex -space-x-2">
                  {mutuals.map(m => <Avatar key={m.user_id} className="w-5 h-5 border border-black"><AvatarImage src={m.avatar_url} /></Avatar>)}
                </div>
                <span>Followed by <span className="text-white font-bold">{mutuals[0].username}</span> {mutuals.length > 1 && `and others`}</span>
              </div>
            )}
            {profile.bio && <p className="mt-3 text-sm font-medium leading-relaxed max-w-md text-white/80">{profile.bio}</p>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 theme-text hover:underline text-sm font-bold w-fit">
                <LinkIcon className="h-3 w-3" /> {new URL(profile.website).hostname}
              </a>
            )}
          </div>

          <div className="flex items-center gap-4 mt-8 py-6 border-y border-white/10 text-center">
             <div className="flex-1 cursor-pointer">
               <p className="text-xl font-black italic leading-none text-white">{posts.length}</p>
               <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">Posts</p>
             </div>
             <div className="flex-1 cursor-pointer" onClick={() => { setFollowersModalTab("followers"); setShowFollowersModal(true); }}>
               <p className="text-xl font-black italic leading-none text-white">{followerCount}</p>
               <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">Followers</p>
             </div>
             <div className="flex-1 cursor-pointer" onClick={() => { setFollowersModalTab("following"); setShowFollowersModal(true); }}>
               <p className="text-xl font-black italic leading-none text-white">{followingCount}</p>
               <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">Following</p>
             </div>
             <div className="flex-1">
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="h-4 w-4 animate-pulse theme-text" />
                  <p className="text-xl font-black italic leading-none theme-text">{profile.total_aura || 0}</p>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">Aura</p>
             </div>
          </div>
        </div>

        {!isPrivateLocked && <MomentHighlights userId={profile.user_id} isOwnProfile={isOwnProfile} />}

        {isPrivateLocked ? (
           <div className="mt-12 text-center py-10 bg-white/5 mx-6 rounded-3xl border border-white/10">
             <Lock className="h-10 w-10 mx-auto mb-4 opacity-50" />
             <h3 className="text-lg font-bold uppercase">This Account is Private</h3>
             <p className="text-xs opacity-50 mt-2">Follow to see their posts and aura.</p>
           </div>
        ) : (
          <div className="px-4 mt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-1 bg-black/20 h-12 p-1 rounded-2xl w-full max-w-xs mx-auto border border-white/5">
                <TabsTrigger value="posts" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:theme-bg data-[state=active]:text-white">
                  <Grid className="h-3.5 w-3.5 mr-2" /> Posts
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="posts" className="mt-6 space-y-6">
                {posts.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <Grid className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-black uppercase text-[10px] tracking-widest">No Posts Yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 px-2">
                    {posts.map(p => <PostCard key={p.id} post={p} onDeleted={fetchData} />)}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      
      <EditProfileModal 
        open={showEditModal} 
        onOpenChange={setShowEditModal} 
        profile={profile} 
        onProfileUpdated={handleProfileUpdated} 
      />
      
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