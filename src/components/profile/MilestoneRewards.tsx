import { motion } from "framer-motion";
import { Gift, Shirt, CupSoda, Trophy, Sparkles, Lock, ArrowRight, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MilestoneRewardsProps {
    aura: number;
}

export function MilestoneRewards({ aura }: MilestoneRewardsProps) {
    const isEligible = aura >= 300;
    const progress = Math.min(100, (aura / 300) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.01 }}
            className={cn(
                "relative overflow-hidden rounded-[2.5rem] p-6 transition-all duration-700",
                "bg-black/40 backdrop-blur-2xl border border-white/10",
                isEligible
                    ? "shadow-[0_0_50px_rgba(var(--theme-accent),0.2)] border-primary/30"
                    : "shadow-2xl"
            )}
        >
            {/* GLOWING AMBIENT BACKGROUND */}
            <div className={cn(
                "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 animate-pulse pointer-events-none",
                isEligible ? "bg-primary" : "bg-white"
            )} />
            <div className={cn(
                "absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-10 animate-pulse delay-1000 pointer-events-none",
                isEligible ? "bg-blue-500" : "bg-purple-500"
            )} />

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                {/* ICON CONTAINER WITH DYNAMIC EFFECTS */}
                <div className="relative shrink-0">
                    <motion.div
                        animate={isEligible ? {
                            rotate: [0, -10, 10, -10, 10, 0],
                            scale: [1, 1.1, 1]
                        } : {}}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className={cn(
                            "w-20 h-20 rounded-[2rem] flex items-center justify-center relative overflow-hidden",
                            isEligible
                                ? "bg-gradient-to-br from-primary via-orange-500 to-yellow-500 shadow-[0_0_30px_rgba(var(--theme-accent),0.4)]"
                                : "bg-white/5 border border-white/10"
                        )}
                    >
                        <Gift className={cn("w-10 h-10", isEligible ? "text-black" : "text-white/20")} />

                        {/* SCANNING LINE EFFECT */}
                        <motion.div
                            animate={{ y: [-40, 40] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="absolute inset-x-0 h-[2px] bg-white/30 blur-[1px] pointer-events-none"
                        />
                    </motion.div>

                    {isEligible && (
                        <div className="absolute -top-3 -right-3">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                            >
                                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400 blur-[2px] opacity-50 absolute" />
                                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                            </motion.div>
                        </div>
                    )}
                </div>

                {/* CONTENT SECTION */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border mb-2 sm:mb-0 w-fit mx-auto sm:mx-0",
                            isEligible ? "bg-primary/20 border-primary/40 theme-text" : "bg-white/5 border-white/10 text-white/40"
                        )}>
                            {isEligible ? "Unbound Reward" : "Legendary Milestone"}
                        </span>
                        <h4 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">
                            Starter Pack
                        </h4>
                    </div>

                    <p className="text-xs font-medium text-white/60 mb-4 max-w-sm">
                        Reach <span className="text-white font-black italic">Level 3</span> to claim your offline bundle: A fresh <span className="theme-text italic">T-Shirt</span> and a chilled <span className="theme-text italic">Diet Coke</span>.
                    </p>

                    <div className="flex flex-col gap-4">
                        {isEligible ? (
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button className="w-full h-12 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] group relative overflow-hidden">
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        Claim Bundle <Zap className="w-4 h-4 fill-current" />
                                    </span>
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -skew-x-12"
                                        animate={{ x: [-200, 200] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    />
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest leading-none">
                                    <div className="flex items-center gap-1.5 text-white/40">
                                        <Lock className="w-3 h-3" />
                                        <span>{aura} / 300 Aura</span>
                                    </div>
                                    <span className="theme-text italic">{Math.floor(progress)}% Complete</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full theme-bg shadow-[0_0_15px_rgba(var(--theme-accent),0.6)] rounded-full relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-stripe_1s_linear_infinite]" />
                                    </motion.div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
