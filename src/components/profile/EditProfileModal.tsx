import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch"; 
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Palette, Lock, Globe, Image as ImageIcon, Upload, Camera, Link as LinkIcon } from "lucide-react"; 
import { uploadFile } from "@/lib/storage"; 

export function EditProfileModal({ open, onOpenChange, profile, onProfileUpdated }: any) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [isPrivate, setIsPrivate] = useState(profile?.is_private || false);
  
  // Theme State
  const [accentColor, setAccentColor] = useState(profile?.theme_config?.accent || "#8B5CF6");
  const [bgStyle, setBgStyle] = useState(profile?.theme_config?.background || "aurora-violet");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(profile?.cover_url || "");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      } else {
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let avatar_url = profile.avatar_url;
      let cover_url = profile.cover_url;

      if (avatarFile) {
        const { url, error } = await uploadFile('avatars', avatarFile, `${profile.user_id}/avatar_${Date.now()}`);
        if (error) throw error;
        avatar_url = url;
      }
      if (coverFile) {
        const { url, error } = await uploadFile('covers', coverFile, `${profile.user_id}/cover_${Date.now()}`);
        if (error) throw error;
        cover_url = url;
      }

      const theme_config = { accent: accentColor, background: bgStyle, aura: "glow" };
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, bio, website, is_private: isPrivate, theme_config, avatar_url, cover_url })
        .eq('user_id', profile.user_id);

      if (error) throw error;
      toast.success("Profile updated!");
      onProfileUpdated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  // --- THE 5 AURORA OPTIONS ---
  const themes = [
    { name: "Nebula", bg: "aurora-violet", color: "#8b5cf6" }, // Purple
    { name: "Emerald", bg: "aurora-emerald", color: "#10b981" }, // Green
    { name: "Abyss", bg: "aurora-blue", color: "#06b6d4" }, // Blue
    { name: "Solar", bg: "aurora-orange", color: "#f97316" }, // Orange
    { name: "Rose", bg: "aurora-rose", color: "#f43f5e" }, // Pink
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-black/95 border-white/10 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-xl font-black italic uppercase">Edit Profile</DialogTitle></DialogHeader>

        <div className="space-y-6 py-4">
          {/* BANNER */}
          <div className="relative group rounded-xl overflow-hidden border border-white/10 h-32 bg-neutral-900 cursor-pointer" onClick={() => coverInputRef.current?.click()}>
             {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><ImageIcon className="h-8 w-8" /></div>}
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="bg-black/50 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-2"><Upload className="h-3 w-3" /> Change Cover</span></div>
          </div>

          {/* AVATAR */}
          <div className="flex justify-center -mt-16 relative z-10">
             <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <div className="h-24 w-24 rounded-full border-4 border-black overflow-hidden bg-neutral-800">
                   {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white">?</div>}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="h-6 w-6 text-white" /></div>
             </div>
          </div>

          <input type="file" ref={coverInputRef} hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'cover')} />
          <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'avatar')} />

          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div className="space-y-2"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div className="space-y-2"><Label>Website</Label><div className="relative"><LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={website} onChange={(e) => setWebsite(e.target.value)} className="pl-9 bg-white/5 border-white/10" placeholder="https://..." /></div></div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">{isPrivate ? <Lock className="h-4 w-4 text-red-400" /> : <Globe className="h-4 w-4 text-green-400" />}<div><p className="font-bold text-sm">Private Account</p><p className="text-[10px] opacity-50">{isPrivate ? "Followers only" : "Public"}</p></div></div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2"><Palette className="h-4 w-4" /> Aurora Theme</Label>
            <div className="grid grid-cols-5 gap-2">
              {themes.map((t) => (
                <button key={t.name} onClick={() => { setAccentColor(t.color); setBgStyle(t.bg); }} className={`h-10 rounded-lg border-2 transition-all ${bgStyle === t.bg ? 'border-white scale-105' : 'border-transparent opacity-50'}`} style={{ background: t.color }} title={t.name} />
              ))}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full font-black uppercase tracking-widest" disabled={loading} style={{ backgroundColor: accentColor }}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}