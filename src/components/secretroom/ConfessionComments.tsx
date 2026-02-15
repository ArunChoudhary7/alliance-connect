import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { validateComment, sanitizeField, commentLimiter, isRateLimited } from "@/lib/security";

interface Comment {
  id: string;
  content: string;
  created_at: string;
}

interface ConfessionCommentsProps {
  confessionId: string | null;
  onClose: () => void;
}

export function ConfessionComments({ confessionId, onClose }: ConfessionCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (confessionId) {
      fetchComments();
    }
  }, [confessionId]);

  async function fetchComments() {
    if (!confessionId) return;
    setLoading(true);

    const { data } = await supabase
      .from('confession_comments')
      .select('id, content, created_at')
      .eq('confession_id', confessionId)
      .order('created_at', { ascending: true });

    setComments(data || []);
    setLoading(false);
  }

  const handleSubmit = async () => {
    if (!user || !confessionId || !newComment.trim()) return;

    // SECURITY: Validate comment content
    const validation = validateComment(newComment);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // SECURITY: Rate limit comments
    if (isRateLimited(commentLimiter, 'confession_comment')) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('confession_comments').insert({
        confession_id: confessionId,
        user_id: user.id,
        content: sanitizeField(newComment.trim(), 500)
      });

      if (error) throw error;

      setNewComment('');
      fetchComments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={!!confessionId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] glass-card border-t border-white/10">
        <SheetHeader className="pb-4 border-b border-white/10">
          <SheetTitle className="gradient-text">Anonymous Comments</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 max-h-[calc(70vh-140px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center shrink-0">
                  <span className="text-xs">🎭</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-muted-foreground">Anonymous</span>
                    <span className="text-xs text-muted-foreground/70">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Comment input */}
        <div className="pt-4 border-t border-white/10 flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add an anonymous comment..."
            className="flex-1 bg-secondary/30"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            size="icon"
            className="bg-gradient-primary"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
