import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User, Bell, Lock, HelpCircle, LogOut, ChevronRight,
  Shield, Eye, MessageSquare, Heart, Users,
  Camera, Info, CreditCard, ShieldAlert, ArrowLeft, Mail
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getInitials, cn } from "@/lib/utils";

// --- FIXED INTERFACE ---
interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean; // Added missing property
}

const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8 px-2">
    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 ml-4">{title}</h2>
    <div className="glass-card rounded-[2rem] overflow-hidden border border-white/5 bg-black/20">{children}</div>
  </div>
);

function SettingItem({ icon, title, description, onClick, rightElement, destructive }: SettingItemProps) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-4 transition-all border-b border-white/5 last:border-0",
        onClick ? "cursor-pointer hover:bg-white/5" : ""
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center",
          destructive ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
        <div className="text-left">
          <p className={cn("font-bold text-sm uppercase tracking-tight", destructive && "text-red-500")}>
            {title}
          </p>
          {description && <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-0.5">{description}</p>}
        </div>
      </div>
      {rightElement || (onClick && <ChevronRight className="h-4 w-4 opacity-20" />)}
    </motion.div>
  );
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { settings, updateSetting } = useSettings();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  
  const [cameraStatus, setCameraStatus] = useState('checking');
  const [isPrivateAccount, setIsPrivateAccount] = useState(profile?.is_private || false);

  useEffect(() => {
    if (profile) setIsPrivateAccount(profile.is_private || false);
  }, [profile]);

  useEffect(() => {
    const checkPerms = async () => {
      try {
        const cam = await navigator.permissions.query({ name: 'camera' as any });
        setCameraStatus(cam.state);
        cam.onchange = () => setCameraStatus(cam.state);
      } catch (e) { setCameraStatus('unsupported'); }
    };
    checkPerms();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handlePrivacyToggle = async (value: boolean) => {
    setIsPrivateAccount(value);
    const { error } = await supabase.from('profiles').update({ is_private: value }).eq('user_id', user?.id);
    if (!error) {
      toast.success(value ? 'Account Private' : 'Account Public');
      refreshProfile();
    } else { toast.error("Sync failed"); }
  };

  const updateActivityStatus = async (value: boolean) => {
    const { error } = await supabase.from('profiles').update({ show_activity: value }).eq('user_id', user?.id);
    if (!error) {
      refreshProfile();
      toast.success("Activity status updated");
    }
  };

  const requestHardware = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      window.location.reload();
    } catch (e) { toast.error("Access denied"); }
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-2 py-8 pb-24">
        <div className="flex items-center gap-4 mb-8 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white/5 border border-white/5">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Settings</h1>
        </div>

        {/* Profile Card */}
        <motion.div 
          onClick={() => navigate('/profile?edit=true')}
          className="glass-card p-6 mx-2 rounded-[2.5rem] mb-10 border border-primary/10 bg-gradient-to-br from-primary/5 to-transparent flex items-center gap-5 cursor-pointer shadow-xl shadow-primary/5"
        >
          <Avatar className="h-16 w-16 ring-4 ring-primary/20">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary text-white font-black">{getInitials(profile?.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-black text-lg uppercase italic tracking-tighter leading-none">@{profile?.username}</h3>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1 italic">Personal Node Details</p>
          </div>
          <ChevronRight className="opacity-20" />
        </motion.div>

        <SettingsSection title="Signal Security">
          <SettingItem icon={<Lock className="w-5 h-5" />} title="Privacy Matrix" description={profile?.is_private ? "Private" : "Public"} onClick={() => setShowPrivacy(true)} />
          <SettingItem icon={<Bell className="w-5 h-5" />} title="Notifications" description="Alert Frequencies" onClick={() => setShowNotifications(true)} />
        </SettingsSection>

        <SettingsSection title="Hardware">
          <SettingItem 
            icon={<Camera className="w-5 h-5" />} 
            title="Camera Signal" 
            description={cameraStatus}
            rightElement={
              <Button size="sm" variant="ghost" onClick={requestHardware} className="text-[10px] font-black uppercase text-primary border border-primary/20 rounded-full h-7 px-4">
                {cameraStatus === 'granted' ? 'Active' : 'Grant'}
              </Button>
            }
          />
        </SettingsSection>

        <SettingsSection title="Infrastructure">
          <SettingItem icon={<CreditCard className="w-5 h-5" />} title="Orders & Billing" onClick={() => toast.info("No active history")} />
          <SettingItem icon={<HelpCircle className="w-5 h-5" />} title="Help Center" onClick={() => setActiveSheet('help')} />
          <SettingItem icon={<Info className="w-5 h-5" />} title="Legal Info" onClick={() => setActiveSheet('legal')} />
        </SettingsSection>

        <div className="mt-10 px-4">
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <div className="cursor-pointer">
                <SettingItem icon={<LogOut className="w-5 h-5" />} title="Disconnect Signal" destructive />
              </div>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-white/10 rounded-[2.5rem]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black italic uppercase text-2xl tracking-tighter text-center">Disconnect?</AlertDialogTitle>
                <AlertDialogDescription className="text-[10px] uppercase font-bold tracking-[0.2em] text-center">Terminate your signal frequency broadcast?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-2 mt-4">
                <AlertDialogAction onClick={handleLogout} className="bg-red-500 text-white rounded-xl font-black uppercase w-full h-12 italic">Log Out</AlertDialogAction>
                <AlertDialogCancel className="rounded-xl font-bold uppercase w-full h-12 border-white/5 bg-white/5">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* PRIVACY SHEET */}
        <Sheet open={showPrivacy} onOpenChange={setShowPrivacy}>
          <SheetContent side="bottom" className="rounded-t-[3rem] glass-card border-white/10 pb-12">
            <SheetHeader className="pb-8"><SheetTitle className="font-black uppercase italic text-2xl text-center">Privacy Matrix</SheetTitle></SheetHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5">
                <div><p className="font-black text-sm uppercase">Private Account</p><p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Only followers can monitor nodes</p></div>
                <Switch checked={isPrivateAccount} onCheckedChange={handlePrivacyToggle} />
              </div>
              <div className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5">
                <div><p className="font-black text-sm uppercase">Activity Status</p><p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Show when active on network</p></div>
                <Switch checked={profile?.show_activity} onCheckedChange={updateActivityStatus} />
              </div>
              <SettingItem icon={<ShieldAlert className="w-5 h-5" />} title="Blocked Signals" onClick={() => toast.info("Zero restricted nodes")} />
            </div>
          </SheetContent>
        </Sheet>

        {/* NOTIFICATIONS SHEET */}
        <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
          <SheetContent side="bottom" className="rounded-t-[3rem] glass-card border-white/10 h-[65vh] pb-12">
            <SheetHeader className="pb-8"><SheetTitle className="font-black uppercase italic text-2xl text-center">Alert Frequencies</SheetTitle></SheetHeader>
            <div className="space-y-3 px-2">
              {[
                { label: 'Likes', icon: Heart, key: 'likes' },
                { label: 'Comments', icon: MessageSquare, key: 'comments' },
                { label: 'Followers', icon: Users, key: 'follows' },
                { label: 'Direct Beams', icon: Mail, key: 'messages' },
              ].map((item) => (
                <div key={item.key} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <item.icon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                  </div>
                  <Switch checked={settings[item.key]} onCheckedChange={(v) => updateSetting(item.key, v)} />
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* LEGAL SHEET */}
        <Sheet open={activeSheet === 'legal'} onOpenChange={() => setActiveSheet(null)}>
          <SheetContent side="bottom" className="rounded-t-[3rem] glass-card border-white/10 h-[45vh] pb-12 text-center">
            <SheetHeader className="pb-6"><SheetTitle className="font-black uppercase italic text-2xl">Legal Signal</SheetTitle></SheetHeader>
            <div className="space-y-2">
              <button className="w-full text-left p-5 bg-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5">Privacy Policy</button>
              <button className="w-full text-left p-5 bg-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5">Terms of Service</button>
              <div className="pt-10 opacity-20 font-black text-[9px] uppercase tracking-widest">Connect Infrastructure v1.0.4</div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}