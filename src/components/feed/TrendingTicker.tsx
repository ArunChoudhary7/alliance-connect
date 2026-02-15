import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Sparkles, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function TrendingTicker() {
    const [trends, setTrends] = useState<string[]>([]);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const fetchTrends = async () => {
            const updates: string[] = [];
            const currentDate = new Date().toISOString();

            // 1. LATEST LOST & FOUND
            const { data: lostItem } = await supabase.from('lost_found_items').select('title, status').eq('status', 'lost').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (lostItem) updates.push(`🔴 Lost: ${lostItem.title}`);

            const { data: foundItem } = await supabase.from('lost_found_items').select('title, status').eq('status', 'found').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (foundItem) updates.push(`🟢 Found: ${foundItem.title} - Check L&F!`);

            // 2. LATEST MARKETPLACE LISTING
            const { data: marketItem } = await supabase.from('marketplace_listings').select('title, price').eq('status', 'available').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (marketItem) updates.push(`💰 New Deal: ${marketItem.title} @ ₹${marketItem.price}`);

            // 3. UPCOMING EVENT (Today or Future)
            const { data: event } = await supabase.from('events').select('title, event_date').gte('event_date', currentDate).order('event_date', { ascending: true }).limit(1).maybeSingle();
            if (event) updates.push(`🎉 Upcoming: ${event.title}`);

            // 4. AURA LEADERBOARD TOP 1
            // (Assuming 'profiles' table has 'aura_points' or we verify logic later. For now, fetch top profile by aura if column exists, else skip)
            // Just fetching recent post as 'Hot Topic' fallback if no leaderboard logic ready
            const { data: hotPost } = await supabase.from('posts').select('content, aura_count').gt('aura_count', 5).order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (hotPost) updates.push(`🔥 Hot Topic: "${hotPost.content?.slice(0, 20)}..." is trending!`);

            // 5. MESS MENU (If table exists, else generic placeholder)
            // updates.push("🍔 Lunch: Paneer Butter Masala (Check Menu)"); 

            // FALLBACK IF EMPTY
            if (updates.length === 0) updates.push("🚀 Nothing new right now, be the first to post!");

            setTrends(updates);
        };

        fetchTrends();
    }, []);

    // SEPARATE EFFECT FOR ROTATION
    useEffect(() => {
        if (trends.length === 0) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % trends.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [trends.length]);

    if (trends.length === 0) return null;

    return (
        <div className="relative overflow-hidden h-10 bg-black/40 backdrop-blur-md border border-white/5 rounded-full mx-4 flex items-center px-4 mb-6">
            <div className="bg-primary/20 p-1.5 rounded-full mr-3">
                <TrendingUp className="h-3 w-3 text-primary animate-pulse" />
            </div>

            <div className="flex-1 relative h-full">
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={index}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 100 }}
                        className="absolute inset-0 flex items-center"
                    >
                        <span className="text-[11px] font-bold uppercase tracking-widest text-white/90 truncate">
                            {trends[index] || "Loading..."}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <div className="w-1 h-1 rounded-full bg-white/20" />
            </div>
        </div>
    );
}
