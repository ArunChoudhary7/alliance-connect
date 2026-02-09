import { useState, useEffect, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { createComment, getComments } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { getInitials } from "@/lib/utils";

export function PostComments({ postId, open, onOpenChange, postOwnerId }: any) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { data, error } = await getComments(postId);
      if (error) {
        console.error("Error fetching comments:", error);
        return;
      }
      if (data) {
        const sanitizedComments = data.map((c: any) => ({
          ...c,
          profiles: c.profiles || { full_name: 'AU User', username: 'user', avatar_url: null }
        }));
        setComments(sanitizedComments);
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open && postId) {
      fetchComments();
      const channel = supabase
        .channel(`comments_realtime_${postId}`) 
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => fetchComments())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [postId, open, fetchComments]);

  const handleSubmit = async () => {
    if (!user || !content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await createComment({ 
        user_id: user.id, 
        post_id: postId, 
        content: content.trim() 
      });
      if (!error) {
        setContent("");
        fetchComments();
        if (postOwnerId && postOwnerId !== user.id) {
          await supabase.from("notifications").insert({ 
            user_id: postOwnerId, 
            actor_id: user.id,
            type: "comment", 
            entity_id: postId,
            content: `${profile?.full_name || 'Someone'} commented on your post`
          });
        }
      }
    } catch (err) {
      console.error("Comment submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col h-[80vh] bg-black/95 border-white/10 backdrop-blur-xl">
        <DialogHeader><DialogTitle className="text-white font-bold">Comments</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
          {loading && comments.length === 0 ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No comments yet. Be the first!</p>
          ) : (
            comments.map((c: any) => (
              <div key={c.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                  <AvatarImage src={c.profiles?.avatar_url} />
                  <AvatarFallback className="bg-secondary text-[10px]">{getInitials(c.profiles?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl text-sm">
                    <p className="font-bold text-xs text-primary mb-1">@{c.profiles?.username || 'user'}</p>
                    <p className="text-white/90 leading-snug">{c.content}</p>
                  </div>
                  <p className="text-[10px] text-white/40 px-2 font-medium">
                    {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 pt-4 border-t border-white/10">
          <Input value={content} onChange={e => setContent(e.target.value)} placeholder="Write a comment..." className="bg-white/5 border-white/10 text-white rounded-full h-11 px-4" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          <Button onClick={handleSubmit} disabled={submitting || !content.trim()} size="icon" className="rounded-full h-11 w-11 bg-primary hover:bg-primary/90 shrink-0">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}