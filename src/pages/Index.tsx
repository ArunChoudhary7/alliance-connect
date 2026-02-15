import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Feed } from "@/components/feed/Feed";
import { useAuth } from "@/hooks/useAuth";
import { CampusCarousel } from "@/components/feed/CampusCarousel";
import { StoriesBar } from "@/components/stories/StoriesBar";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { TrendingTicker } from "@/components/feed/TrendingTicker";

export default function Index() {
  const { user, loading } = useAuth();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto w-full pb-20">

        {/* Stories - Padded for clean alignment */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mb-6 mt-2"
        >
          <StoriesBar />
        </motion.div>

        {/* Command Center - Native swipe feel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <CampusCarousel />
        </motion.div>

        {/* Trending Ticker - New Dynamic Element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4"
        >
          <TrendingTicker />
        </motion.div>

        {/* Feed Section with Layout Transitions */}
        <div className="px-4 mt-4 space-y-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <motion.div
                key="skeleton-loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FeedSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="main-feed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Feed />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}