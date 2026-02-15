import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, ALLOWED_DOMAIN, isValidAllianceEmail } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

const authSchema = z.object({
  email: z.string().email("Invalid email address").refine(
    (email) => isValidAllianceEmail(email),
    `Only ${ALLOWED_DOMAIN} emails (and authorized admin emails) are allowed`
  ),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate inputs
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            setError("Invalid email or password");
          } else if (error.message.includes("Email not confirmed")) {
            setError("Please verify your email before signing in");
          } else {
            setError(error.message);
          }
        } else {
          navigate("/");
        }
      } else {
        const { data, error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            setError("This email is already registered. Try logging in.");
          } else {
            setError(error.message);
          }
        } else if (data?.user) {
          setSuccess("Auconnect sent you verification link! Please check your email.");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-card p-8 rounded-2xl">
        <div className="text-center mb-8 relative">
          {/* FESTIVAL DECORATION */}
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-yellow-400 rounded-full blur-[50px] opacity-40 animate-pulse" />
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500 rounded-full blur-[50px] opacity-40 animate-pulse delay-700" />

          <motion.div
            className="inline-block mb-4"
            whileHover={{ scale: 1.05 }}
          >
            <div className="relative group cursor-pointer">
              {/* Festival Logo Placeholder / Drop Zone */}
              <div className="w-40 h-40 mx-auto relative flex items-center justify-center bg-white rounded-full p-1 shadow-[0_0_30px_rgba(255,255,255,0.15)] ring-4 ring-white/5">
                <div className="absolute inset-0 bg-gradient-to-tr from-red-500 via-yellow-400 to-blue-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
                <img
                  src="/festival_logo.png"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    // Fallback to text logo if image missing
                    e.currentTarget.parentElement?.classList.remove('bg-white'); // Remove white bg if fallback text is shown
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                  className="relative w-full h-full object-contain rounded-full z-10"
                  alt="Lit Fest 2026"
                />
                <div className="hidden flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">LIT FEST</span>
                  <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground">2026</span>
                </div>
              </div>
            </div>
          </motion.div>

          <h1 className="text-3xl font-black italic tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-blue-600 animate-gradient-x">
            ALLIANCE ONE
          </h1>
          <p className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Feb 19-21 • The Grand Celebration</p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-500"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={`yourname${ALLOWED_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20"
                required
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 hover:opacity-90 transition-all font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLogin ? (
                "Enter the Festival"
              ) : (
                "Get Your Pass"
              )}
            </Button>
          </motion.div>
        </form>

        <div className="mt-6 text-center space-y-3">
          {isLogin && (
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </button>
          )}
          <div>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccess(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <span className="text-primary font-medium">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span className="text-primary font-medium">Sign in</span>
                </>
              )}
            </button>
          </div>
        </div>

        <ForgotPasswordModal
          open={showForgotPassword}
          onOpenChange={setShowForgotPassword}
        />

        <div className="mt-6 pt-6 border-t border-border/50">
          <p className="text-xs text-center text-muted-foreground">
            🔒 Only <span className="text-primary font-medium">{ALLOWED_DOMAIN}</span> emails (and admin) are allowed
          </p>
        </div>
      </div>
    </motion.div>
  );
}
