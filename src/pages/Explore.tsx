import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, Grid, Film, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
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

interface TrendingHashtag {
  tag: string;
  count: number;
}

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchExplorePosts();
    fetchTrendingTags();
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      searchPosts(debouncedQuery);
    } else {
      fetchExplorePosts();
    }
  }, [debouncedQuery]);

  const fetchExplorePosts = async () => {
    setLoading(true);
    
    // Fetch posts with images for grid
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, images, video_url, aura_count, comments_count")
      .not("images", "is", null)
      .order("aura_count", { ascending: false })
      .limit(30);

    if (postsData) {
      setPosts(postsData.filter(p => p.images && p.images.length > 0));
    }

    // Fetch reels (video posts)
    const { data: reelsData } = await supabase
      .from("posts")
      .select("id, images, video_url, aura_count, comments_count")
      .not("video_url", "is", null)
      .order("aura_count", { ascending: false })
      .limit(20);

    if (reelsData) {
      setReels(reelsData);
    }

    setLoading(false);
  };

  const fetchTrendingTags = async () => {
    const { data } = await supabase
      .from("posts")
      .select("hashtags")
      .not("hashtags", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      const tagCounts: Record<string, number> = {};
      data.forEach(post => {
        post.hashtags?.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const sorted = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTrendingTags(sorted);
    }
  };

  const searchPosts = async (query: string) => {
    setLoading(true);
    
    const { data } = await supabase
      .from("posts")
      .select("id, images, video_url, aura_count, comments_count, hashtags")
      .or(`content.ilike.%${query}%,hashtags.cs.{${query.toLowerCase()}}`)
      .not("images", "is", null)
      .order("aura_count", { ascending: false })
      .limit(30);

    if (data) {
      setPosts(data.filter(p => p.images && p.images.length > 0));
    }
    
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-4"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search posts, hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-secondary/50 border-border/50 focus:border-primary"
          />
        </motion.div>

        {/* Trending Tags */}
        {!searchQuery && trendingTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Trending</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((item, index) => (
                <motion.button
                  key={item.tag}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSearchQuery(item.tag)}
                  className="px-3 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary text-sm transition-colors"
                >
                  #{item.tag}
                  <span className="ml-1 text-xs text-muted-foreground">{item.count}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-secondary/50 mb-4">
            <TabsTrigger value="posts" className="rounded-lg">
              <Grid className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="reels" className="rounded-lg">
              <Film className="h-4 w-4 mr-2" />
              Reels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <Grid className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No posts found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Link to={`/post/${post.id}`} className="block aspect-square relative group overflow-hidden rounded-lg">
                      <img
                        src={post.images?.[0]}
                        alt=""
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <span className="text-white text-sm font-medium">
                          ❤️ {post.aura_count || 0}
                        </span>
                        <span className="text-white text-sm font-medium">
                          💬 {post.comments_count || 0}
                        </span>
                      </div>
                      {post.images && post.images.length > 1 && (
                        <div className="absolute top-2 right-2">
                          <Grid className="h-4 w-4 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reels">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : reels.length === 0 ? (
              <div className="text-center py-20">
                <Film className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No reels yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a video post to see it here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {reels.map((reel, index) => (
                  <motion.div
                    key={reel.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Link to={`/reels?start=${reel.id}`} className="block aspect-[9/16] relative group overflow-hidden rounded-xl">
                      <video
                        src={reel.video_url || ""}
                        className="w-full h-full object-cover"
                        muted
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-sm">
                        <span>❤️ {reel.aura_count || 0}</span>
                        <Film className="h-4 w-4" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
