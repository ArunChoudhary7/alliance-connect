import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/feed/PostCard";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function PostDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!user_id (
            username,
            full_name,
            avatar_url,
            total_aura
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error("Signal Lost:", error);
        navigate('/');
      } else {
        setPost(data);
      }
      setLoading(false);
    };

    if (id) fetchPost();
  }, [id, navigate]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* Instagram Style Header */}
        <div className="flex items-center gap-4 mb-6 mt-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="rounded-full bg-white/5 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">
            Signal Focus
          </span>
        </div>

        {loading ? (
          <div className="h-[50vh] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            {/* Reuse your existing PostCard component */}
            <PostCard post={post} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}