import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Feed } from "@/components/feed/Feed";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { user, loading } = useAuth();

  // 1. Precise Loading State
  // We use a centered spinner that matches the AU Connect project style.
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  // 2. Data Rendering
  // Since App.tsx handles the Auth/Onboarding redirects now, 
  // we can safely render the Feed knowing the user is validated.
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto w-full">
        <Feed />
      </div>
    </AppLayout>
  );
}