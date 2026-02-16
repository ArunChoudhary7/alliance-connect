import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  UtensilsCrossed,
  ArrowRight,
  Zap,
  Swords,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export function CampusCarousel() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [menuData, setMenuData] = useState<any>(null);
  const [topUser, setTopUser] = useState<any>(null);

  const [width, setWidth] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const [menuRes, rankRes] = await Promise.all([
        supabase.from('mess_menu').select('lunch, breakfast, snacks, dinner').eq('day_name', 'Today').maybeSingle(),
        // Matches the new 'aura_leaderboard' view we created
        supabase.from('aura_leaderboard').select('*').limit(1).maybeSingle()
      ]);
      if (menuRes.data) setMenuData(menuRes.data);
      if (rankRes.data) setTopUser(rankRes.data);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (carouselRef.current) {
      setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
    }
  }, [menuData, topUser]);

  const cards = [
    {
      id: 'events',
      title: "Events",
      subtitle: "Campus Life",
      icon: <Calendar className="h-5 w-5 text-pink-500" />,
      color: "from-pink-500/30 via-pink-500/10 to-transparent",
      borderColor: "border-pink-500/30",
      glow: "shadow-[0_0_20px_rgba(236,72,153,0.15)]",
      path: "/events"
    },
    {
      id: 'mess',
      title: "Mess Menu",
      subtitle: "Alliance Food Court",
      icon: <UtensilsCrossed className="h-5 w-5 text-orange-500" />,
      color: "from-orange-500/30 via-orange-500/10 to-transparent",
      borderColor: "border-orange-500/30",
      glow: "shadow-[0_0_20px_rgba(249,115,22,0.15)]",
      path: "/mess-menu"
    },
    {
      id: 'duel',
      title: "Aura Rank",
      subtitle: "Campus Duel",
      icon: <Swords className="h-5 w-5 text-yellow-500" />,
      color: "from-yellow-500/30 via-yellow-500/10 to-transparent",
      borderColor: "border-yellow-500/30",
      glow: "shadow-[0_0_20px_rgba(234,179,8,0.15)]",
      path: "/leaderboard"
    }
  ];

  return (
    <div className="relative mb-8 w-full overflow-hidden" ref={carouselRef}>
      <motion.div
        drag="x"
        dragConstraints={{ right: 0, left: -width - 64 }}
        dragElastic={0.1}
        className="flex gap-4 px-4 w-max py-2 cursor-grab active:cursor-grabbing"
      >
        {cards.map((card) => (
          <motion.div
            key={card.id}
            whileTap={{ scale: 0.97 }}
            className={`min-w-[280px] md:min-w-[340px] glass-card p-6 rounded-[2rem] border ${card.borderColor} ${card.glow} bg-gradient-to-br ${card.color} relative overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
            onClick={() => navigate(card.path)}
          >
            <div className="flex justify-between items-start pointer-events-none">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-background/50">{card.icon}</div>
                  <h3 className="text-xl font-bold uppercase tracking-tight">{card.title}</h3>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">{card.subtitle}</p>
              </div>
              <div className="bg-white/10 p-2.5 rounded-2xl shadow-lg"><ArrowRight className="h-4 w-4 text-white" /></div>
            </div>

            <div className="mt-4 pointer-events-none min-h-[40px]">
              {card.id === 'mess' && (
                <div className="space-y-2">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-30">Coming up next:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {menuData?.lunch?.length > 0 ? (
                      menuData.lunch.slice(0, 3).map((i: string) => (
                        <Badge key={i} variant="secondary" className="bg-white/5 border-none text-[8px] uppercase font-bold py-1 px-2 text-orange-200">
                          {i}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[9px] font-bold opacity-20 uppercase tracking-tighter">Menu not uploaded yet</span>
                    )}
                  </div>
                </div>
              )}

              {card.id === 'duel' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-bold uppercase">
                    <span className="opacity-40">Gap to #1</span>
                    <span className="text-yellow-500">
                      {Math.max(((topUser?.total_aura || 0) - (profile?.total_aura || 0)), 0)}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((profile?.total_aura || 0) / (topUser?.total_aura || 1)) * 100, 100)}%` }}
                      className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                    />
                  </div>
                </div>
              )}

              {card.id === 'events' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-pink-500">
                      Don't Miss Out
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                        <div className={`w-full h-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 opacity-${100 - (i * 20)}`} />
                      </div>
                    ))}
                    <div className="h-6 w-6 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[8px] font-bold">
                      +
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        <div className="min-w-[20px]" />
      </motion.div>
    </div>
  );
}