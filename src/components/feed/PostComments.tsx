import { useState, useEffect } from "react";
import { Send, Loader2, X } from "lucide-react";
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

  const fetchComments = async () => {
    if (!postId) return;
    const { data } = await getComments(postId);
    // FIXED: Added strict mapping to prevent "Cannot read property of null" errors
    if (data) {
      const sanitizedComments = data.map((c: any) => ({
        ...c,
        profiles: c.profiles || { full_name: 'AU User', username: 'user', avatar_url: null }
      }));
      setComments(sanitizedComments);
    }
  };

  useEffect(() => {
    if (open && postId) {
      fetchComments();
      const channel = supabase
        .channel(`comments-${postId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => fetchComments())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [postId, open]);

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;
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
        // Notification Logic
        if (postOwnerId && postOwnerId !== user.id) {
          await supabase.from("notifications").insert({ 
            user_id: postOwnerId, 
            type: "comment", 
            title: "New Comment", 
            body: `${profile?.full_name || 'Someone'} commented on your post`, 
            data: { post_id: postId }, 
            is_read: false 
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
      <DialogContent className="max-w-md flex flex-col max-h-[80vh] glass-card border-none">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No comments yet.</p>
          ) : (
            comments.map((c: any) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={c.profiles?.avatar_url} />
                  <AvatarFallback>{getInitials(c.profiles?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="bg-secondary/30 p-3 rounded-2xl text-sm">
                    <p className="font-bold text-xs mb-1">{c.profiles?.full_name || 'AU User'}</p>
                    <p className="text-foreground/90">{c.content}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">
                    {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 pt-4 border-t border-border/50">
          <Input 
            value={content} 
            onChange={e => setContent(e.target.value)} 
            placeholder="Add a comment..." 
            className="bg-secondary/20 border-none focus-visible:ring-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !content.trim()} 
            size="icon" 
            className="bg-gradient-primary shrink-0"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}