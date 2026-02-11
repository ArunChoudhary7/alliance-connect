import { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, Loader2, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AdminMenuUpload({ isOpen, onClose, onSuccess }: any) {
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [formData, setFormData] = useState({
    breakfast: "",
    lunch: "",
    snacks: "",
    dinner: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUploadAndSave = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus("uploading");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `menu-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('campus_assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campus_assets')
        .getPublicUrl(fileName);

      // Save the URL so we can use it in the final save
      (window as any).lastUploadedMenuUrl = publicUrl;
      toast.success("Photo uploaded! Now confirm the items.");
      setStatus("idle");
    } catch (err: any) {
      toast.error("Upload failed");
      setStatus("idle");
    }
  };

  const saveMenu = async () => {
    const imageUrl = (window as any).lastUploadedMenuUrl;
    if (!imageUrl) return toast.error("Please upload a menu photo first");

    setStatus("saving");
    try {
      const { error } = await supabase
        .from('mess_menu')
        .upsert({ 
          day_name: 'Today',
          image_url: imageUrl,
          // Split by comma and trim spaces to create clean arrays for your badges
          breakfast: formData.breakfast.split(',').map(i => i.trim()).filter(i => i),
          lunch: formData.lunch.split(',').map(i => i.trim()).filter(i => i),
          snacks: formData.snacks.split(',').map(i => i.trim()).filter(i => i),
          dinner: formData.dinner.split(',').map(i => i.trim()).filter(i => i),
          updated_at: new Date().toISOString()
        }, { onConflict: 'day_name' });

      if (error) throw error;

      toast.success("Menu Updated Successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Save failed");
    } finally {
      setStatus("idle");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <motion.div className="relative w-full max-w-lg glass-card p-6 md:p-8 rounded-[2.5rem] border-white/10 bg-zinc-900 overflow-y-auto max-h-[90vh] no-scrollbar">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Update Mess
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6">
          {/* STEP 1: UPLOAD */}
          <div className="relative aspect-video rounded-2xl bg-zinc-800 border-2 border-dashed border-white/5 flex flex-col items-center justify-center">
            {status === "uploading" ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2 w-full h-full justify-center">
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {(window as any).lastUploadedMenuUrl ? "Change Photo" : "Upload Menu Photo"}
                </span>
                <input type="file" className="hidden" onChange={handleUploadAndSave} accept="image/*" />
              </label>
            )}
          </div>

          {/* STEP 2: MANUAL ENTRY */}
          <div className="grid grid-cols-1 gap-4">
            {['breakfast', 'lunch', 'snacks', 'dinner'].map((meal) => (
              <div key={meal} className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">{meal}</label>
                <Input 
                  name={meal}
                  placeholder="Item 1, Item 2, Item 3..."
                  className="bg-white/5 border-white/5 h-11 rounded-xl text-sm"
                  onChange={handleInputChange}
                />
              </div>
            ))}
          </div>

          <Button 
            onClick={saveMenu} 
            disabled={status !== "idle"} 
            className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest"
          >
            {status === "saving" ? <Loader2 className="animate-spin" /> : "Broadcast Menu"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}