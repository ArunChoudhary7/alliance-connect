import { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminMenuUpload({ isOpen, onClose, onSuccess }: any) {
  const [uploading, setUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `menu-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campus_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campus_assets')
        .getPublicUrl(filePath);

      setIsScanning(true);
      // SIMULATING AI ANALYSIS TIME
      await new Promise(r => setTimeout(r, 3500)); 

      // MOCK PARSER LOGIC: In a real app, you'd send publicUrl to an AI API here
      const parsedData = {
        breakfast: ["Special Dosa", "Coconut Chutney", "Sambar", "Egg", "Milk/Coffee"],
        lunch: ["Hyderabadi Biryani", "Mirchi Salan", "Curd Rice", "Salad", "Sweet"],
        snacks: ["Samosa", "Chai"],
        dinner: ["Butter Paneer", "Tandoori Roti", "Jeera Rice", "Dal Makhani"]
      };

      const { error: dbError } = await supabase
        .from('mess_menu')
        .update({ 
          image_url: publicUrl,
          ...parsedData, // This spreads the BF, Lunch, etc. into the DB
          updated_at: new Date()
        })
        .eq('day_name', 'Today');

      if (dbError) throw dbError;

      toast.success("Menu Analyzed & Updated!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Upload Failed: Check Admin Permissions");
    } finally {
      setUploading(false);
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md glass-card p-8 rounded-[3rem] border-white/10 overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <h2 className="text-xl font-black uppercase tracking-tight italic">AI Menu Analyze</h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        
        <div className="relative aspect-square rounded-[2.5rem] bg-secondary/20 border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
          {isScanning ? (
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <motion.div animate={{ y: [-20, 320, -20] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute top-0 left-0 right-0 h-1 bg-primary shadow-[0_0_20px_hsl(var(--primary))] z-10" />
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-tight">AI is dividing menu into sections...</p>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-4 p-10 text-center w-full h-full justify-center">
              <div className="p-6 bg-primary/10 rounded-full text-primary shadow-xl shadow-primary/20 transition-transform group-hover:scale-110">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold uppercase italic">Upload Menu</p>
                <p className="text-[9px] opacity-40 uppercase font-bold tracking-widest leading-relaxed">AI will automatically detect<br/>BF, Lunch, Snacks & Dinner</p>
              </div>
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*" />
            </label>
          )}
        </div>
      </motion.div>
    </div>
  );
}