import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { getPosts, supabase } from "@/lib/supabase";
import { PostCard } from "./PostCard";
import { Button } from "@/components/ui/button";
import { CreatePost } from "./CreatePost";
import { AnimatePresence, motion } from "framer-motion";

export function Feed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const highlightedPostId = searchParams.get("post");

  const fetchFeed = async () => {
    setLoading(true);
    if (highlightedPostId) {
      const { data } = await supabase.from("posts").select("*, profiles(*)").eq("id", highlightedPostId).maybeSingle();
      if (data) {
        // Fetch aura status for the highlighted post too
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        let has_aura = false;
        if (currentUser) {
          const { data: auraData } = await supabase.from("auras").select("id").eq("post_id", data.id).eq("user_id", currentUser.id).maybeSingle();
          has_aura = !!auraData;
        }
        setPosts([{ ...data, aura_count: Number(data.aura_count) || 0, has_aura }]);
      } else {
        setPosts([]);
      }
    } else {
      const { data } = await getPosts(20, 0);
      setPosts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();

    // REAL-TIME: Listen for deletions (Stealth burns or manual deletes)
    const channel = supabase.channel('feed-realtime')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((current) => current.filter(p => p.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        if (!highlightedPostId) fetchFeed();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [highlightedPostId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {!highlightedPostId && (
        <CreatePost onPostCreated={fetchFeed} />
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-[2rem] border border-white/5">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground font-medium">No posts found</p>
          <Button variant="link" onClick={fetchFeed} className="mt-2 theme-text font-bold uppercase text-[10px] tracking-widest">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Feed
          </Button>
        </div>
      ) : (
        <div className="flex flex-col">
          <AnimatePresence mode="popLayout">
            {posts.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              >
                <PostCard post={p} onDeleted={fetchFeed} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}  