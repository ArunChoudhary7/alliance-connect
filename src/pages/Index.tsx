import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Feed } from "@/components/feed/Feed";
import { useAuth } from "@/hooks/useAuth";
import { CampusCarousel } from "@/components/feed/CampusCarousel";
import { StoriesBar } from "@/components/stories/StoriesBar";

export default function Index() {
  const { user, loading } = useAuth();

  // Premium Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 rounded-full border-t-4 border-primary border-b-transparent shadow-[0_0_15px_rgba(var(--primary),0.5)]"
          />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary animate-pulse">
          Connecting to Alliance...
        </p>
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Container: We remove restricted horizontal padding to let the 
         Carousel swipe freely to the screen edges.
      */}
      <div className="max-w-2xl mx-auto w-full pb-20">
        
        {/* Stories - Padded for clean alignment */}
        <div className="px-4 mb-6 mt-2">
          <StoriesBar />
        </div>

        {/* COMMAND CENTER 
           This component handles its own internal horizontal padding 
           to ensure the 'Swipe' feel is native and smooth.
        */}
        <CampusCarousel />

        {/* Feed - Padded to match the rest of the UI */}
        <div className="px-4 space-y-6">
          <Feed />
        </div>
      </div>
    </AppLayout>
  );
}