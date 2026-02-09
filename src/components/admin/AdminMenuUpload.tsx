import { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { analyzeMenuWithGemini } from "@/lib/gemini";

export function AdminMenuUpload({ isOpen, onClose, onSuccess }: any) {
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "saving">("idle");

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatus("uploading");
      
      // 1. Upload to Supabase (Unique Name)
      const fileExt = file.name.split('.').pop();
      const fileName = `menu-${Date.now()}.${fileExt}`;
      const filePath = `menu-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campus_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campus_assets')
        .getPublicUrl(filePath);

      // 2. Analyze (Will use Backup if AI fails)
      setStatus("analyzing");
      const parsedData = await analyzeMenuWithGemini(file);
      console.log("Saving Data:", parsedData);

      // 3. Save to DB (Upsert to fix missing row error)
      setStatus("saving");

      const { error: dbError } = await supabase
        .from('mess_menu')
        .upsert({ 
          day_name: 'Today',
          image_url: publicUrl,
          breakfast: parsedData.breakfast || [],
          lunch: parsedData.lunch || [],
          snacks: parsedData.snacks || [],
          dinner: parsedData.dinner || [],
          updated_at: new Date()
        }, { onConflict: 'day_name' });

      if (dbError) throw dbError;

      toast.success("Menu Updated Successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Update Failed. Check console.");
    } finally {
      setStatus("idle");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
      <motion.div className="relative w-full max-w-md glass-card p-8 rounded-[3rem] border-white/10 overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <h2 className="text-xl font-black uppercase italic gradient-text">Update Menu</h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        
        <div className="relative aspect-square rounded-[2.5rem] bg-secondary/20 border-2 border-dashed border-white/10 flex flex-col items-center justify-center">
          {status !== "idle" ? (
            <div className="text-center px-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">
                {status === "uploading" && "Uploading Image..."}
                {status === "analyzing" && "Analyzing Menu..."}
                {status === "saving" && "Saving Data..."}
              </p>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-4 w-full h-full justify-center group hover:bg-secondary/30 transition-colors">
              <Upload className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold uppercase opacity-50">Upload Menu Photo</span>
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
            </label>
          )}
        </div>
      </motion.div>
    </div>
  );
}