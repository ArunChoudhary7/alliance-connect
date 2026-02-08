import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, Search, PlusSquare, User, LogOut, Menu, 
  ShoppingBag, Compass, MessageCircle, Settings, PackageSearch, 
  Zap, Ghost, Users2, Heart, X, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { signOut, supabase } from "@/lib/supabase"; 
import { CreatePostModal } from "@/components/feed/CreatePostModal";
import { motion } from "framer-motion";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // --- UNREAD CHECKER ---
  useEffect(() => {
    if (!user) return;

    const checkUnread = async () => {
      const { count } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id); // Only count messages sent TO me
      
      setHasUnreadMessages(!!count && count > 0);
    };

    checkUnread();

    // Real-time listener for new messages
    const channel = supabase.channel('global-unread-check')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        if (payload.new.sender_id !== user.id) setHasUnreadMessages(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, (payload) => {
         // Re-check if marked as read
         checkUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);


  // 1. MOBILE BOTTOM NAV
  const mobileNavItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: PlusSquare, label: "Create", action: () => setShowCreateModal(true) },
    { icon: Heart, label: "Activity", path: "/activity" },
    { icon: User, label: "Profile", path: profile?.username ? `/profile/${profile.username}` : "/profile" },
  ];

  // 2. DESKTOP SIDEBAR
  const desktopNavItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: Heart, label: "Activity", path: "/activity" },
    { icon: Ghost, label: "Secret Room", path: "/secret-room" },
    { icon: ShoppingBag, label: "Marketplace", path: "/marketplace" },
    { icon: Users2, label: "Squads", path: "/study-groups" },
    { icon: Compass, label: "Circles", path: "/circles" },
    { icon: PackageSearch, label: "Lost & Found", path: "/lost-found" },
    { icon: User, label: "Profile", path: profile?.username ? `/profile/${profile.username}` : "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-x-hidden">
      
      {/* --- MOBILE HEADER --- */}
      <header className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-2xl bg-secondary/30">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85%] glass-card p-6 border-none rounded-r-[3rem] shadow-2xl flex flex-col">
            <SheetHeader className="text-left mb-8">
              <SheetTitle className="text-3xl font-black italic uppercase tracking-tighter gradient-text">Alliance</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
              <Link to="/secret-room" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/20 transition-colors"><Ghost className="h-5 w-5" /><span className="font-bold uppercase text-xs tracking-widest">Secret Room</span></Link>
              <Link to="/marketplace" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/20 transition-colors"><ShoppingBag className="h-5 w-5" /><span className="font-bold uppercase text-xs tracking-widest">Market</span></Link>
              <Link to="/study-groups" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/20 transition-colors"><Users2 className="h-5 w-5" /><span className="font-bold uppercase text-xs tracking-widest">Squads</span></Link>
              <Link to="/circles" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/20 transition-colors"><Compass className="h-5 w-5" /><span className="font-bold uppercase text-xs tracking-widest">Circles</span></Link>
              <Link to="/lost-found" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/20 transition-colors"><PackageSearch className="h-5 w-5" /><span className="font-bold uppercase text-xs tracking-widest">Lost & Found</span></Link>
              <Link to="/settings" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/20 transition-colors"><Settings className="h-5 w-5" /><span className="font-bold uppercase text-xs tracking-widest">Settings</span></Link>
            </nav>
            <Button variant="ghost" className="justify-start gap-4 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10 mt-auto" onClick={async () => { await signOut(); navigate("/auth"); }}><LogOut className="h-5 w-5" /> Logout</Button>
          </SheetContent>
        </Sheet>
        
        <Link to="/" className="font-black text-xl italic tracking-tighter absolute left-1/2 -translate-x-1/2 gradient-text flex items-center gap-1">
          AU CONNECT <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        </Link>
        
        <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => navigate('/messages')}>
            <MessageCircle className="h-5 w-5" />
            {hasUnreadMessages && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
            )}
        </Button>
      </header>

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-border/50 bg-background/50 backdrop-blur-xl p-4 z-50">
        <div className="text-2xl font-black mb-10 px-4 italic uppercase tracking-tighter gradient-text flex items-center gap-2">
          Alliance <Sparkles className="h-4 w-4 text-primary" />
        </div>
        
        <nav className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {desktopNavItems.map((item, idx) => (
            <div key={idx}>
              {item.label === 'Profile' && <div className="h-px bg-white/10 my-4 mx-4" />}
              
              <Link 
                to={item.path!} 
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                  location.pathname === item.path 
                    ? "bg-primary/10 text-primary font-bold shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${location.pathname === item.path ? "fill-primary/20" : ""}`} /> 
                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              </Link>
            </div>
          ))}
        </nav>

        <Button 
          onClick={() => setShowCreateModal(true)} 
          className="mt-4 w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
        >
          <PlusSquare className="mr-2 h-4 w-4" /> Create Post
        </Button>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 w-full max-w-screen-xl mx-auto md:pl-64 pb-24 md:pb-8 pt-4">
        {children}
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-t border-white/5 h-20 px-4 pb-safe flex items-center justify-around">
        {mobileNavItems.map((item, i) => {
          const isActive = item.path === location.pathname;
          return (
            <button
              key={i}
              onClick={() => item.action ? item.action() : navigate(item.path!)}
              className="relative p-3 flex flex-col items-center justify-center transition-all active:scale-90"
            >
              <item.icon className={`h-6 w-6 transition-all duration-300 ${isActive ? "text-primary scale-110 drop-shadow-[0_0_8px_hsl(var(--primary))]" : "text-muted-foreground opacity-50"}`} />
              {isActive && (
                <motion.div layoutId="nav-glow" className="absolute inset-0 bg-primary/10 rounded-2xl -z-10" />
              )}
            </button>
          );
        })}
      </nav>

      <CreatePostModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}