import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Loader2, Plus, Image as ImageIcon } from "lucide-react";
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

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [bioLink, setBioLink] = useState(profile?.bio_link || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [year, setYear] = useState(profile?.year || "");
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [coverUrl, setCoverUrl] = useState(profile?.cover_url || "");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    const { url, error } = await uploadFile("avatars", file, user.id);
    setUploadingAvatar(false);

    if (error) {
      toast.error("Failed to upload avatar");
      return;
    }

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

    if (error) {
      toast.error("Failed to upload cover");
      return;
    }

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

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
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

  const getInitials = (name: string | null) => {
    if (!name) return "AU";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cover Image */}
          <div>
            <Label className="text-sm text-muted-foreground">Cover Image</Label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="relative h-24 mt-2 rounded-xl bg-gradient-primary overflow-hidden cursor-pointer group"
            >
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-primary-foreground/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingCover ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="relative cursor-pointer group"
            >
              <Avatar className="h-20 w-20 ring-4 ring-background">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl font-bold">
                  {getInitials(fullName || profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium">Profile Photo</p>
              <p className="text-sm text-muted-foreground">Click to change</p>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="mt-1.5"
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={160}
              className="mt-1.5 min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground mt-1">{bio.length}/160</p>
          </div>

          {/* Bio Link */}
          <div>
            <Label htmlFor="bioLink">Website/Link</Label>
            <Input
              id="bioLink"
              value={bioLink}
              onChange={(e) => setBioLink(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="mt-1.5"
            />
          </div>

          {/* Department */}
          <div>
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div>
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skills */}
          <div>
            <Label>Skills (max 10)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              />
              <Button type="button" onClick={addSkill} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {skills.map((skill) => (
                <motion.span
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
