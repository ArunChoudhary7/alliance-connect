import { useState, useEffect } from "react";
import { Heart, Trash2, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { getInitials } from "@/lib/utils";
export function PostCard({ post, onDeleted }: any) {
  const { user } = useAuth();
  const [hasAura, setHasAura] = useState(false);
  const [auraCount, setAuraCount] = useState(post.aura_count || 0);

  useEffect(() => {
    if (user) {
      supabase.from("auras")
        .select("*")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setHasAura(!!data));
    }
  }, [user, post.id]);

  const handleAura = async () => {
    if (!user) return;
    if (hasAura) {
      setAuraCount(c => c - 1); 
      setHasAura(false);
      await supabase.from("auras").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setAuraCount(c => c + 1); 
      setHasAura(true);
      await supabase.from("auras").insert({ post_id: post.id, user_id: user.id });
    }
  };

  const author = post.profiles || { username: 'user', full_name: 'AU User', avatar_url: '' };

  return (
    <Card className="glass-card border-none mb-6 overflow-hidden shadow-lg">
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Link to={`/profile/${author.username}`}>
          <Avatar className="ring-2 ring-primary/10">
            <AvatarImage src={author.avatar_url} />
            <AvatarFallback>{getInitials(author.full_name)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link to={`/profile/${author.username}`} className="font-semibold text-sm">{author.full_name}</Link>
          <p className="text-[10px] text-muted-foreground">
            {post.created_at ? formatDistanceToNow(new Date(post.created_at)) : 'just now'} ago
          </p>
        </div>
        {user?.id === post.user_id && (
          <Button variant="ghost" size="icon" onClick={() => supabase.from("posts").delete().eq("id", post.id).then(onDeleted)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {post.content && <p className="text-sm mb-3 px-4">{post.content}</p>}
        
        {/* --- VIDEO PLAYER LOGIC (FIXES THE BLANK POSTS) --- */}
        {post.video_url ? (
          <div className="relative w-full bg-black flex items-center justify-center min-h-[300px]">
            <video 
              src={post.video_url} 
              controls 
              className="w-full max-h-[500px] object-contain"
              playsInline
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : post.images?.[0] ? (
          /* Image fallback */
          <img src={post.images[0]} className="w-full object-cover max-h-[500px]" alt="Post content" />
        ) : null}
      </CardContent>

      <CardFooter className="p-3 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={handleAura} className={hasAura ? "text-pink-500" : ""}>
          <Heart className={`h-4 w-4 mr-2 ${hasAura ? "fill-current" : ""}`} /> {auraCount} Aura
        </Button>
      </CardFooter>
    </Card>
  );
}