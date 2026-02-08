import { useState, useRef } from "react";
import { Image, Video, Camera, X, Send, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { createPost } from "@/lib/supabase";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

export function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string; type: 'image' | 'video' }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    e.target.value = ''; 
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!user || (!content.trim() && selectedFiles.length === 0)) return;
    setIsSubmitting(true);
    try {
      let imageUrls: string[] = [];
      let videoUrl: string | null = null;

      for (const item of selectedFiles) {
        // FIXED: Using 'videos' bucket now that it is defined in storage.ts
        const bucket = item.type === 'video' ? 'videos' : 'posts';
        const { url, error } = await uploadFile(bucket, item.file, user.id);
        
        if (error) throw error;
        if (url) {
          if (item.type === 'video') videoUrl = url;
          else imageUrls.push(url);
        }
      }

      const { error } = await createPost({
        user_id: user.id,
        content: content.trim(),
        images: imageUrls.length > 0 ? imageUrls : null,
        video_url: videoUrl 
      });

      if (error) throw error;
      toast.success("Post created!");
      setContent("");
      setSelectedFiles([]);
      onPostCreated();
    } catch (error) {
      toast.error("Failed to post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-card border-none overflow-hidden mb-6">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-4">
            <Textarea 
              placeholder="What's on your mind?" 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] bg-transparent border-none focus-visible:ring-0 resize-none p-0 text-sm"
            />
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((item, i) => (
                  <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden group">
                    {item.type === 'image' ? (
                      <img src={item.preview} className="h-full w-full object-cover" />
                    ) : (
                      <video src={item.preview} className="h-full w-full object-cover" />
                    )}
                    <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex gap-1">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" accept="image/*" />
                <input type="file" ref={videoInputRef} onChange={handleFileSelect} className="hidden" accept="video/*" />
                <input type="file" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment" />

                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-muted-foreground hover:text-primary"><Image className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => videoInputRef.current?.click()} className="text-muted-foreground hover:text-primary"><Video className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => cameraInputRef.current?.click()} className="text-muted-foreground hover:text-primary"><Camera className="h-5 w-5" /></Button>
              </div>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-full px-6 bg-gradient-primary">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}