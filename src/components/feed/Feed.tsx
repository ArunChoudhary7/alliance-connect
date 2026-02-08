import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { getPosts, supabase } from "@/lib/supabase";
import { PostCard } from "./PostCard";
import { Button } from "@/components/ui/button";
// Removed StoriesBar import to prevent duplicate
import { CreatePost } from "./CreatePost";

export function Feed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const highlightedPostId = searchParams.get("post");

  const fetchFeed = async () => {
    setLoading(true);
    if (highlightedPostId) {
      // Fetch single post if viewing a specific one
      const { data } = await supabase.from("posts").select("*, profiles(*)").eq("id", highlightedPostId).maybeSingle();
      setPosts(data ? [data] : []);
    } else {
      // Fetch normal feed
      const { data } = await getPosts(10, 0);
      setPosts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
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
      {/* FIX: Removed <StoriesBar /> from here. 
         It is now correctly handled by Index.tsx only.
      */}

      {!highlightedPostId && (
        <CreatePost onPostCreated={fetchFeed} />
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-xl">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No posts found</p>
          <Button variant="link" onClick={fetchFeed} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      ) : (
        posts.map((p) => (
          <PostCard key={p.id} post={p} onDeleted={fetchFeed} />
        ))
      )}
    </div>
  );
}