import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, 
  Search, 
  PlusSquare, 
  Heart, 
  User, 
  LogOut, 
  Menu, 
  ShoppingBag, 
  Compass, 
  MessageCircle, 
  Settings, 
  PackageSearch, 
  CalendarDays,
  Ghost,
  BarChart3,
  Users2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/supabase"; 
import { CreatePostModal } from "@/components/feed/CreatePostModal";

// FIXED: Changed React.CoreNode to React.ReactNode
export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainNavItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: Ghost, label: "Secret Room", path: "/secret-room" },
    { icon: BarChart3, label: "Polls", path: "/polls" },
    { icon: Users2, label: "Study Squads", path: "/study-groups" },
    { icon: ShoppingBag, label: "Market", path: "/marketplace" },
    { icon: Compass, label: "Circles", path: "/circles" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: User, label: "Profile", path: profile?.username ? `/profile/${profile.username}` : "/profile" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* MOBILE HEADER */}
      <header className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-xl tracking-tight italic">Alliance</Link>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => navigate('/activity')}><Heart className="h-6 w-6" /></Button>
           <Button variant="ghost" size="icon" onClick={() => navigate('/messages')}><MessageCircle className="h-6 w-6" /></Button>
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-border/50 bg-background/50 backdrop-blur-xl p-4 z-50 justify-between">
        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-100px)] scrollbar-hide">
          <div className="text-2xl font-black mb-8 px-4 italic uppercase tracking-tighter">Alliance</div>
          {mainNavItems.map((item) => (
            <Link 
              key={item.label} 
              to={item.path} 
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                location.pathname === item.path 
                ? "bg-primary/10 text-primary font-bold shadow-sm" 
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" /> 
              <span className="text-sm font-semibold uppercase tracking-tight">{item.label}</span>
            </Link>
          ))}
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-muted-foreground hover:bg-secondary/50 hover:text-primary w-full text-left transition-all mt-4 border border-dashed border-border/50"
          >
            <PlusSquare className="h-5 w-5" /> 
            <span className="text-sm font-bold uppercase tracking-tight">Create Post</span>
          </button>
        </nav>

        <div className="pt-4 border-t border-border/50">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-4 py-4 h-auto text-muted-foreground rounded-2xl hover:bg-secondary/50 transition-all">
                <Menu className="h-6 w-6" /> 
                <span className="font-bold uppercase tracking-widest text-xs">More</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 glass-card p-6 flex flex-col border-none">
               <div className="text-2xl font-black mb-10 italic uppercase tracking-tighter">Alliance</div>
               <nav className="space-y-3 flex-1">
                 <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-12 font-bold uppercase text-xs tracking-widest" onClick={() => { navigate('/lost-found'); setIsMenuOpen(false); }}><PackageSearch className="h-5 w-5" /> Lost & Found</Button>
                 <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-12 font-bold uppercase text-xs tracking-widest" onClick={() => { navigate('/events'); setIsMenuOpen(false); }}><CalendarDays className="h-5 w-5" /> Events</Button>
                 <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-12 font-bold uppercase text-xs tracking-widest" onClick={() => { navigate('/settings'); setIsMenuOpen(false); }}><Settings className="h-5 w-5" /> Settings</Button>
               </nav>
               <Button variant="ghost" className="w-full justify-start text-destructive gap-3 rounded-xl h-12 font-bold uppercase text-xs tracking-widest hover:bg-destructive/10" onClick={async () => { await signOut(); navigate("/auth"); }}><LogOut className="h-5 w-5" /> Sign Out</Button>
            </SheetContent>
          </Sheet>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-screen-xl mx-auto md:pl-64 pb-20 md:pb-4 p-4">
        {children}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border/50 h-16 flex items-center justify-around px-2">
        <Link to="/" className={`p-2 transition-all ${location.pathname === "/" ? "text-primary scale-125" : "text-muted-foreground"}`}>
          <Home className="h-6 w-6" />
        </Link>
        <Link to="/search" className={`p-2 transition-all ${location.pathname === "/search" ? "text-primary scale-125" : "text-muted-foreground"}`}>
          <Search className="h-6 w-6" />
        </Link>
        
        <Link to="/study-groups" className={`p-2 transition-all ${location.pathname === "/study-groups" ? "text-primary scale-125" : "text-muted-foreground"}`}>
          <Users2 className="h-6 w-6" />
        </Link>
        
        <button onClick={() => setShowCreateModal(true)} className="p-2 text-muted-foreground hover:text-primary transition-all active:scale-90">
          <PlusSquare className="h-7 w-7" />
        </button>
        
        <Link to="/secret-room" className={`p-2 transition-all ${location.pathname === "/secret-room" ? "text-primary scale-125" : "text-muted-foreground"}`}>
          <Ghost className="h-6 w-6" />
        </Link>
      </nav>

      <CreatePostModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}