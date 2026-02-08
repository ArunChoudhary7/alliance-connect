import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User,
  Bell,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Shield,
  Eye,
  MessageSquare,
  Heart,
  Users,
  Loader2,
  UserPlus,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
}

function SettingItem({ icon, title, description, onClick, rightElement }: SettingItemProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center justify-between p-4 rounded-xl ${
        onClick ? 'cursor-pointer hover:bg-secondary/50' : ''
      } transition-colors`}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {rightElement || (onClick && <ChevronRight className="h-5 w-5 text-muted-foreground" />)}
    </motion.div>
  );
}

interface FollowRequest {
  id: string;
  requester_id: string;
  created_at: string;
  profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { settings, updateSetting } = useSettings();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const [isPrivateAccount, setIsPrivateAccount] = useState(profile?.is_private || false);

  useEffect(() => {
    if (profile) {
      setIsPrivateAccount(profile.is_private || false);
    }
  }, [profile]);

  useEffect(() => {
    if (user && showFollowRequests) {
      fetchFollowRequests();
    }
  }, [user, showFollowRequests]);

  const fetchFollowRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('follow_requests')
      .select('*')
      .eq('target_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch profiles for requesters
      const requesterIds = data.map(r => r.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', requesterIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setFollowRequests(data.map(r => ({
        ...r,
        profile: profileMap.get(r.requester_id),
      })));
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || 'Failed to log out');
      setLoggingOut(false);
    }
  };

  const handlePrivacyToggle = async (value: boolean) => {
    setIsPrivateAccount(value);
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_private: value })
        .eq('user_id', user.id);
      
      if (error) {
        toast.error('Failed to update privacy setting');
        setIsPrivateAccount(!value);
      } else {
        toast.success(value ? 'Account is now private' : 'Account is now public');
        refreshProfile();
      }
    }
  };

  const handleAcceptRequest = async (requestId: string, requesterId: string) => {
    if (!user) return;
    setProcessingRequest(requestId);

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('follow_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create follow relationship
      const { error: followError } = await supabase
        .from('follows')
        .insert({ follower_id: requesterId, following_id: user.id });

      if (followError) throw followError;

      toast.success('Follow request accepted');
      setFollowRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to accept request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId);

    try {
      const { error } = await supabase
        .from('follow_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Follow request rejected');
      setFollowRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    updateSetting('dark_mode', value);
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold gradient-text">Settings</h1>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-2xl mb-6"
          onClick={() => navigate('/profile')}
        >
          <div className="flex items-center gap-4 cursor-pointer">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {profile?.username?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{profile?.full_name || 'User'}</p>
              <p className="text-sm text-muted-foreground">@{profile?.username || 'username'}</p>
              <p className="text-xs text-primary mt-1">Edit profile</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </motion.div>

        {/* Settings Groups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl mb-4 overflow-hidden"
        >
          <SettingItem
            icon={<User className="h-5 w-5 text-primary" />}
            title="Edit Profile"
            description="Update your profile information"
            onClick={() => navigate('/profile')}
          />
          <Separator className="mx-4" />
          <SettingItem
            icon={<Lock className="h-5 w-5 text-primary" />}
            title="Privacy"
            description="Manage who can see your content"
            onClick={() => setShowPrivacy(true)}
          />
          <Separator className="mx-4" />
          <SettingItem
            icon={<Bell className="h-5 w-5 text-primary" />}
            title="Notifications"
            description="Configure notification preferences"
            onClick={() => setShowNotifications(true)}
          />
          {isPrivateAccount && (
            <>
              <Separator className="mx-4" />
              <SettingItem
                icon={<UserPlus className="h-5 w-5 text-primary" />}
                title="Follow Requests"
                description="Manage pending follow requests"
                onClick={() => setShowFollowRequests(true)}
                rightElement={
                  followRequests.length > 0 ? (
                    <Badge variant="default" className="bg-primary">
                      {followRequests.length}
                    </Badge>
                  ) : undefined
                }
              />
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl mb-4 overflow-hidden"
        >
          <SettingItem
            icon={settings.dark_mode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            title="Dark Mode"
            description="Toggle dark/light theme"
            rightElement={
              <Switch checked={settings.dark_mode} onCheckedChange={handleDarkModeToggle} />
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl mb-4 overflow-hidden"
        >
          <SettingItem
            icon={<HelpCircle className="h-5 w-5 text-primary" />}
            title="Help & Support"
            description="Get help or report a problem"
            onClick={() => toast.info('Help center coming soon!')}
          />
          <Separator className="mx-4" />
          <SettingItem
            icon={<Shield className="h-5 w-5 text-primary" />}
            title="About"
            description="App version and legal"
            onClick={() => toast.info('Version 1.0.0')}
          />
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <div className="cursor-pointer">
                <SettingItem
                  icon={<LogOut className="h-5 w-5 text-destructive" />}
                  title="Log Out"
                  description="Sign out of your account"
                />
              </div>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card">
              <AlertDialogHeader>
                <AlertDialogTitle>Log Out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to log out of your account?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="bg-destructive text-destructive-foreground"
                >
                  {loggingOut ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Log Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>

        {/* Privacy Sheet */}
        <Sheet open={showPrivacy} onOpenChange={setShowPrivacy}>
          <SheetContent className="glass-card border-white/10">
            <SheetHeader>
              <SheetTitle className="gradient-text">Privacy Settings</SheetTitle>
              <SheetDescription>
                Control who can see your activity
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Private Account</p>
                    <p className="text-xs text-muted-foreground">
                      Only approved followers can see your posts
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPrivateAccount}
                  onCheckedChange={handlePrivacyToggle}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Activity Status</p>
                    <p className="text-xs text-muted-foreground">
                      Show when you're online
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.show_activity_status}
                  onCheckedChange={(value) => updateSetting('show_activity_status', value)}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Notifications Sheet */}
        <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
          <SheetContent className="glass-card border-white/10">
            <SheetHeader>
              <SheetTitle className="gradient-text">Notifications</SheetTitle>
              <SheetDescription>
                Choose what you want to be notified about
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <p className="font-medium text-sm">Likes</p>
                </div>
                <Switch 
                  checked={settings.likes_notifications} 
                  onCheckedChange={(value) => updateSetting('likes_notifications', value)} 
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <p className="font-medium text-sm">Comments</p>
                </div>
                <Switch 
                  checked={settings.comments_notifications} 
                  onCheckedChange={(value) => updateSetting('comments_notifications', value)} 
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-green-500" />
                  <p className="font-medium text-sm">New Followers</p>
                </div>
                <Switch 
                  checked={settings.follows_notifications} 
                  onCheckedChange={(value) => updateSetting('follows_notifications', value)} 
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  <p className="font-medium text-sm">Direct Messages</p>
                </div>
                <Switch 
                  checked={settings.messages_notifications} 
                  onCheckedChange={(value) => updateSetting('messages_notifications', value)} 
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Follow Requests Sheet */}
        <Sheet open={showFollowRequests} onOpenChange={setShowFollowRequests}>
          <SheetContent className="glass-card border-white/10">
            <SheetHeader>
              <SheetTitle className="gradient-text">Follow Requests</SheetTitle>
              <SheetDescription>
                People who want to follow you
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {followRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No pending follow requests
                </p>
              ) : (
                followRequests.map((request) => (
                  <div key={request.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={request.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20">
                        {request.profile?.username?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{request.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{request.profile?.username || 'unknown'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(request.id, request.requester_id)}
                        disabled={processingRequest === request.id}
                      >
                        {processingRequest === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Accept'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={processingRequest === request.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
