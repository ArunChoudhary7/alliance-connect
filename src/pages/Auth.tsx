import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";

export default function Auth() {
  const { user, loading, isOnboarded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (isOnboarded) {
        navigate("/");
      } else {
        navigate("/onboarding");
      }
    }
  }, [user, loading, isOnboarded, navigate]);

  if (loading) {
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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-black">
      {/* FESTIVAL BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-yellow-500/20 rounded-full blur-[80px]" />
        <div className="absolute top-[10%] right-[20%] w-[200px] h-[200px] bg-green-500/20 rounded-full blur-[60px]" />

        {/* Confetti / Noise Texture overlay if possible, or just subtle grid */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="relative z-10 w-full">
        <AuthForm />
      </div>
    </div>
  );
}
