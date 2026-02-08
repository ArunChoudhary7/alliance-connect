import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, Grid, Film, Loader2, Trophy, Star, Medal, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

interface Post {
  id: string;
  images: string[] | null;
  video_url: string | null;
  aura_count: number | null;
  comments_count: number | null;
}

interface LeaderboardUser {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  total_aura: number;
  department: string;
  aura_growth: number;
  campus_rank: number;
}

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchExplorePosts();
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from("aura_leaderboard").select("*");
    if (data) setLeaderboard(data as LeaderboardUser[]);
  };

  const fetchExplorePosts = async () => {
    setLoading(true);
    const [pRes, rRes] = await Promise.all([
      supabase.from("posts").select("id, images, video_url, aura_count, comments_count").not("images", "is", null).order("aura_count", { ascending: false }).limit(21),
      supabase.from("posts").select("id, images, video_url, aura_count, comments_count").not("video_url", "is", null).order("aura_count", { ascending: false }).limit(10)
    ]);
    if (pRes.data) setPosts(pRes.data.filter(p => p.images && p.images.length > 0));
    if (rRes.data) setReels(rRes.data);
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="h-6 w-6 text-yellow-400 fill-yellow-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400 fill-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600 fill-amber-600" />;
    return <span className="text-xs font-black opacity-30 italic">#{rank}</span>;
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search campus..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 rounded-2xl bg-secondary/40 border-none font-medium focus-visible:ring-1 ring-primary" 
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-secondary/30 h-12 p-1 rounded-2xl mb-6">
            <TabsTrigger value="posts" className="rounded-xl font-black uppercase text-[10px] tracking-widest transition-all data-[state=active]:bg-background">Feed</TabsTrigger>
            <TabsTrigger value="reels" className="rounded-xl font-black uppercase text-[10px] tracking-widest transition-all data-[state=active]:bg-background">Reels</TabsTrigger>
            <TabsTrigger value="stars" className="rounded-xl font-black uppercase text-[10px] tracking-widest transition-all data-[state=active]:bg-background">Stars</TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div> : (
              <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
                {posts.map(p => (
                  <Link key={p.id} to={`/post/${p.id}`} className="aspect-square relative group">
                    <img src={p.images?.[0]} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase">View Post</div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reels">
             <div className="grid grid-cols-2 gap-2">
                {reels.map(r => (
                  <Link key={r.id} to={`/reels?start=${r.id}`} className="aspect-[9/16] relative rounded-2xl overflow-hidden bg-secondary">
                    <video src={r.video_url || ""} className="w-full h-full object-cover" muted />
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white font-black italic text-xs drop-shadow-lg">
                      <Star className="h-3 w-3 fill-primary text-primary" /> {r.aura_count}
                    </div>
                  </Link>
                ))}
             </div>
          </TabsContent>

          <TabsContent value="stars" className="space-y-3">
             {leaderboard.map((u) => (
               <motion.div 
                 key={u.user_id} 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className={`p-4 rounded-[2rem] flex items-center gap-4 border border-white/5 shadow-xl transition-colors ${u.campus_rank <= 3 ? 'bg-primary/5' : 'bg-secondary/20'}`}
               >
                 <div className="w-10 flex justify-center">{getRankIcon(u.campus_rank)}</div>
                 <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                   <AvatarImage src={u.avatar_url} />
                   <AvatarFallback className="font-black bg-secondary uppercase">{u.username?.[0]}</AvatarFallback>
                 </Avatar>
                 <div className="flex-1">
                    <h4 className="font-black uppercase italic tracking-tighter text-sm">{u.full_name}</h4>
                    <p className="text-[9px] font-black uppercase text-primary tracking-widest leading-none mt-1">{u.department || 'Alliance Student'}</p>
                 </div>
                 <div className="text-right">
                    <div className="flex items-center gap-1 justify-end font-black italic text-lg leading-none">
                      <Star className="h-4 w-4 text-primary fill-primary" /> {u.total_aura}
                    </div>
                    {u.aura_growth > 0 && (
                      <p className="text-[8px] font-black text-green-500 uppercase flex items-center justify-end gap-1 mt-1">
                        <ArrowUpRight className="h-2 w-2" /> +{u.aura_growth}
                      </p>
                    )}
                 </div>
               </motion.div>
             ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}