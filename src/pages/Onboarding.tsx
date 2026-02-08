import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { useAuth } from "@/hooks/useAuth";

export default function Onboarding() {
  const { user, loading, isOnboarded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (isOnboarded) {
        navigate("/");
      }
    }
  }, [user, loading, isOnboarded, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center py-8">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full">
        <OnboardingForm />
      </div>
    </div>
  );
}
