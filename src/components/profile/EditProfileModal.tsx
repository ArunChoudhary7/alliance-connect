import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Camera, Loader2, Plus, Image as ImageIcon, 
  Link as LinkIcon, Trash2 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/supabase";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated: () => void;
}

const departments = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Business Administration",
  "Commerce",
  "Arts",
  "Law",
  "Medicine",
  "Other",
];

const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Alumni", "Faculty"];

export function EditProfileModal({ open, onOpenChange, onProfileUpdated }: EditProfileModalProps) {
  const { user, profile } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Profile States
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [bioLink, setBioLink] = useState(profile?.bio_link || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [year, setYear] = useState(profile?.year || "");
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [coverUrl, setCoverUrl] = useState(profile?.cover_url || "");
  
  // Spotlight Links State
  const [spotlightLinks, setSpotlightLinks] = useState<any[]>(profile?.spotlight_links || []);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const { url, error } = await uploadFile("avatars", file, user.id);
    setUploadingAvatar(false);
    if (url) {
      setAvatarUrl(url);
      toast.success("Avatar uploaded!");
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    const { url, error } = await uploadFile("covers", file, user.id);
    setUploadingCover(false);
    if (url) {
      setCoverUrl(url);
      toast.success("Cover uploaded!");
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && skills.length < 10 && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const addSpotlightLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      setSpotlightLinks([...spotlightLinks, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }]);
      setNewLinkTitle("");
      setNewLinkUrl("");
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await updateProfile(user.id, {
      full_name: fullName.trim() || undefined,
      bio: bio.trim() || undefined,
      bio_link: bioLink.trim() || undefined,
      department: department || undefined,
      year: year || undefined,
      skills: skills.length > 0 ? skills : undefined,
      avatar_url: avatarUrl || undefined,
      cover_url: coverUrl || undefined,
      spotlight_links: spotlightLinks,
    });
    setLoading(false);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      onProfileUpdated();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none glass-card p-6 scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="font-black uppercase italic tracking-tighter text-2xl">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Cover Image */}
          <div>
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Cover Image</Label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="relative h-24 mt-2 rounded-2xl bg-secondary/30 overflow-hidden cursor-pointer group border border-white/5"
            >
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingCover ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </div>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div onClick={() => avatarInputRef.current?.click()} className="relative cursor-pointer group">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-gradient-primary text-white text-xl font-bold">
                  {getInitials(fullName || profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div>
              <p className="font-black uppercase italic text-sm">Profile Photo</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Tap to change</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-secondary/30 border-none h-12 rounded-xl" />
            </div>
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} className="bg-secondary/30 border-none rounded-xl min-h-[80px]" />
            </div>
          </div>

          {/* Spotlight Links */}
          <div className="pt-6 border-t border-white/5 space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-1">University Spotlight</Label>
            <div className="space-y-2">
              <Input placeholder="Link Title (e.g. Portfolio)" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} className="bg-secondary/30 border-none h-11 rounded-xl" />
              <div className="flex gap-2">
                <Input placeholder="URL (https://...)" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="bg-secondary/30 border-none h-11 rounded-xl" />
                <Button onClick={addSpotlightLink} size="icon" className="h-11 w-11 rounded-xl shadow-lg"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              {spotlightLinks.map((link, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black uppercase italic">{link.title}</span>
                  </div>
                  <button onClick={() => setSpotlightLinks(spotlightLinks.filter((_, i) => i !== idx))} className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-gradient-primary shadow-xl shadow-primary/20">
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}