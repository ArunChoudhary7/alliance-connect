import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, Search, PlusSquare, User, LogOut, Menu, 
  ShoppingBag, Compass, MessageCircle, Settings, PackageSearch, 
  Ghost, Users2, Heart, Sparkles, Palette, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('feed-atmosphere') || 'aurora-violet');

  const atmospheres = [
    { id: 'aurora-emerald', name: 'Emerald', color: '#10b981' },
    { id: 'aurora-violet', name: 'Violet', color: '#8b5cf6' },
    { id: 'aurora-blue', name: 'Abyss', color: '#06b6d4' },
    { id: 'aurora-orange', name: 'Solar', color: '#f97316' },
    { id: 'aurora-rose', name: 'Crimson', color: '#f43f5e' },
    { id: 'midnight-obsidian', name: 'Midnight', color: '#000000' },
    { id: 'clean-minimal', name: 'Titanium', color: '#e4e4e7' },
  ];

  const updateAtmosphere = (id: string) => {
    setCurrentTheme(id);
    localStorage.setItem('feed-atmosphere', id);
    document.documentElement.setAttribute('data-theme', id);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    if (!user) return;
    const checkUnread = async () => {
      const { count } = await supabase.from('direct_messages').select('*', { count: 'exact', head: true }).eq('is_read', false).neq('sender_id', user.id);
      setHasUnreadMessages(!!count && count > 0);
    };
    checkUnread();
    const channel = supabase.channel('unread-check').on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => checkUnread()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const mobileNavItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: PlusSquare, label: "Create", action: () => setShowCreateModal(true) },
    { icon: Heart, label: "Activity", path: "/activity" },
    { icon: User, label: "Profile", path: profile?.username ? `/profile/${profile.username}` : "/profile" },
  ];

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

  const isLight = currentTheme === 'clean-minimal';

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.8 }}
      className={`min-h-screen bg-background flex flex-col md:flex-row overflow-x-hidden ${isLight ? 'text-zinc-900' : 'text-white'}`}
      data-theme={currentTheme}
    >
      {/* --- MOBILE HEADER --- */}
      <header className={`md:hidden sticky top-0 z-40 backdrop-blur-xl border-b px-4 h-16 flex items-center justify-between ${isLight ? 'bg-white/80 border-black/5' : 'bg-black/60 border-white/10'}`}>
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className={`rounded-2xl ${isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'}`}>
              <Menu className={`h-5 w-5 ${isLight ? 'text-black' : 'text-white'}`} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className={`w-[85%] glass-card p-6 border-none rounded-r-[3rem] flex flex-col ${isLight ? 'bg-white' : 'bg-black/95'}`}>
            <SheetHeader className="text-left mb-8">
              <SheetTitle className={`text-3xl font-black italic uppercase tracking-tighter ${isLight ? 'text-black' : 'gradient-text'}`}>Alliance</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2">
              {desktopNavItems.slice(3, 8).map((item, idx) => (
                <Link key={idx} to={item.path} onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}>
                  <item.icon className={`h-5 w-5 group-hover:scale-110 transition-transform ${isLight ? 'text-black/70 group-hover:text-black' : 'text-white/90 group-hover:text-white'}`} />
                  <span className={`font-bold uppercase text-xs tracking-widest ${isLight ? 'text-black/80' : 'text-white/80'}`}>{item.label}</span>
                </Link>
              ))}
            </nav>
            <Button variant="ghost" className="justify-start gap-4 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-red-500 hover:bg-red-500/10 mt-auto" onClick={async () => { await signOut(); navigate("/auth"); }}>
              <LogOut className="h-5 w-5" /> Logout
            </Button>
          </SheetContent>
        </Sheet>
        
        <Link to="/" className={`font-black text-xl italic tracking-tighter absolute left-1/2 -translate-x-1/2 flex items-center gap-1 ${isLight ? 'text-black' : 'text-white'}`}>
          AU CONNECT <Sparkles className="h-3 w-3 theme-text animate-pulse" />
        </Link>
        
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={`rounded-full ${isLight ? 'text-black/60 hover:bg-black/5' : 'text-white/80 hover:bg-white/10'}`}><Palette className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={`backdrop-blur-3xl border rounded-2xl p-2 w-48 shadow-2xl ${isLight ? 'bg-white border-black/5' : 'bg-black/95 border-white/20'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 mb-1 ${isLight ? 'text-black/30' : 'text-white/40'}`}>Atmosphere</p>
              {atmospheres.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => updateAtmosphere(t.id)} className="flex items-center justify-between rounded-xl py-3 focus:bg-accent/10">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border border-black/10 shadow-inner" style={{ backgroundColor: t.color }} />
                    <span className={`text-xs font-bold ${isLight ? 'text-black' : 'text-white'}`}>{t.name}</span>
                  </div>
                  {currentTheme === t.id && <Check className="h-3 w-3 theme-text" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className={`rounded-full relative ${isLight ? 'text-black/60' : 'text-white/80'}`} onClick={() => navigate('/messages')}>
              <MessageCircle className="h-5 w-5" />
              {hasUnreadMessages && <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />}
          </Button>
        </div>
      </header>

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className={`hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r backdrop-blur-3xl p-4 z-50 ${isLight ? 'bg-white/40 border-black/5' : 'bg-black/40 border-white/10'}`}>
        <div className={`text-2xl font-black mb-10 px-4 italic uppercase tracking-tighter flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>Alliance <Sparkles className="h-4 w-4 theme-text" /></div>
        <nav className="space-y-1 flex-1 overflow-y-auto pr-2 scrollbar-hide">
          {desktopNavItems.map((item, idx) => (
            <Link key={idx} to={item.path!} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${location.pathname === item.path ? (isLight ? "bg-black/5 text-black font-bold shadow-sm" : "bg-white/10 text-white font-bold shadow-sm") : (isLight ? "text-black/60 hover:bg-black/5 hover:text-black" : "text-white/70 hover:bg-white/5 hover:text-white")}`}>
              <item.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${location.pathname === item.path ? "theme-text" : (isLight ? "text-black/90" : "text-white/90")}`} /> 
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          ))}
          <div className={`h-px my-6 mx-4 ${isLight ? 'bg-black/5' : 'bg-white/10'}`} />
          <div className="px-4">
            <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isLight ? 'text-black/30' : 'text-white/30'}`}>Atmosphere</p>
            <div className="grid grid-cols-5 gap-2">
              {atmospheres.map((t) => (
                <button 
                  key={t.id} 
                  onClick={() => updateAtmosphere(t.id)} 
                  className={`h-6 w-6 rounded-full border-2 transition-all ${currentTheme === t.id ? "border-primary scale-110 shadow-lg" : "border-black/5 opacity-50 hover:opacity-100"}`} 
                  style={{ backgroundColor: t.color }} 
                />
              ))}
            </div>
          </div>
        </nav>
        <Button onClick={() => setShowCreateModal(true)} className={`mt-4 w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${isLight ? 'bg-black text-white hover:bg-black/90' : 'bg-white text-black hover:bg-white/90'}`}>
          <PlusSquare className="mr-2 h-4 w-4" /> Create Post
        </Button>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 w-full max-w-screen-xl mx-auto md:pl-64 pb-24 md:pb-8 pt-4">
        <div className="feed-atmosphere-container min-h-screen px-2 pt-4 relative">
          <div className="relative z-10">{children}</div>
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-3xl border-t h-20 px-4 flex items-center justify-around pb-safe ${isLight ? 'bg-white/90 border-black/5' : 'bg-black/80 border-white/10'}`}>
        {mobileNavItems.map((item, i) => {
          const isActive = item.path === location.pathname;
          return (
            <button key={i} onClick={() => item.action ? item.action() : navigate(item.path!)} className="relative p-3 flex flex-col items-center justify-center transition-all active:scale-90">
              <item.icon className={`h-6 w-6 transition-all duration-300 ${isActive ? "theme-text scale-110 drop-shadow-[0_0_8px_var(--theme-accent)]" : (isLight ? "text-black/40" : "text-white/40")}`} />
              {isActive && <motion.div layoutId="nav-glow" className={`absolute inset-0 rounded-2xl -z-10 ${isLight ? 'bg-black/5' : 'bg-white/5'}`} />}
            </button>
          );
        })}
      </nav>

      <CreatePostModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </motion.div>
  );
}