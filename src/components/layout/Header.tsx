import { useState, useEffect } from "react";
import { Bell, MessageCircle, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { MenuDrawer } from "./MenuDrawer";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const { profile, user } = useAuth();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // 🔍 SEARCH STATE
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Fetch unread counts
  useEffect(() => {
    if (!user) return;
    fetchUnreadCounts();
  }, [user]);

  // 🔍 DEBOUNCED USER SEARCH
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (search.length < 2) {
        setResults([]);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .or(`username.ilike.%${search}%,full_name.ilike.%${search}%`)
        .limit(5);

      setResults(data || []);
    }, 300); // debounce delay

    return () => clearTimeout(timeout);
  }, [search]);

  const fetchUnreadCounts = async () => {
    if (!user) return;

    // Notifications
    const { count: notifCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadNotifications(notifCount || 0);

    // Conversations
    const { data: convos } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

    if (convos?.length) {
      const convoIds = convos.map((c) => c.id);

      const { count: msgCount } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convoIds)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      setUnreadMessages(msgCount || 0);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "AU";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50"
    >
      <div className="container flex h-16 items-center justify-between px-4">

        {/* LEFT */}
        <div className="flex items-center gap-2">
          <MenuDrawer />

          <Link to="/" className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary blur-lg opacity-50 rounded-full" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">AU</span>
              </div>
            </div>

            <span className="hidden sm:inline-block text-xl font-bold gradient-text">
              AUConnect
            </span>
          </Link>
        </div>

        {/* 🔍 SEARCH BAR CENTER */}
        <div className="relative w-72 hidden md:block">
          <div className="flex items-center bg-secondary/40 rounded-xl px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowResults(true);
              }}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              placeholder="Search users..."
              className="bg-transparent outline-none px-2 py-2 w-full text-sm"
            />
          </div>

          {/* RESULTS DROPDOWN */}
          {showResults && results.length > 0 && (
            <div className="absolute top-12 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {results.map((u) => (
                <Link
                  key={u.username}
                  to={`/profile/${u.username}`}   // ✅ correct route
                  className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/50"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={u.avatar_url || ""} />
                    <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                  </Avatar>

                  <div className="text-sm">
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-muted-foreground text-xs">@{u.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">

          {/* Messages */}
          <Link to="/messages">
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <MessageCircle className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-destructive text-white rounded-full px-1">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </Button>
          </Link>

          {/* Notifications */}
          <Link to="/activity">
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-destructive text-white rounded-full px-1">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </Button>
          </Link>

          {/* Avatar */}
          <Link to="/profile">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Avatar className="h-9 w-9 ring-2 ring-primary/30 cursor-pointer">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback>
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
