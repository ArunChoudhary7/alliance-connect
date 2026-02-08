import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthForm } from "@/components/auth/AuthForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { useAuth } from "@/hooks/useAuth";

export default function Auth() {
  const { user, loading, isOnboarded } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get("reset") === "true";

  useEffect(() => {
    // Don't redirect if user is resetting password
    if (!loading && user && !isReset) {
      if (isOnboarded) {
        navigate("/");
      } else {
        navigate("/onboarding");
      }
    }
  }, [user, loading, isOnboarded, navigate, isReset]);

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
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full">
        {isReset && user ? <ResetPasswordForm /> : <AuthForm />}
      </div>
    </div>
  );
}
