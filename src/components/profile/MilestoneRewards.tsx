import { motion } from "framer-motion";
import { Gift, Shirt, CupSoda, Trophy, Sparkles, Lock, ArrowRight, Zap, Target, Star } from "lucide-react";
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative overflow-hidden rounded-[2.5rem] p-8 transition-all duration-700 group",
                "bg-[#0a0a0c] border border-white/5 shadow-2xl",
                isEligible
                    ? "ring-1 ring-yellow-500/30 shadow-[0_20px_60px_-15px_rgba(234,179,8,0.2)]"
                    : "hover:border-white/10"
            )}
        >
            {/* MOVING LIQUID BACKGROUND EFFECT */}
            <motion.div
                animate={{
                    backgroundPosition: ["0% 0%", "100% 100%", "0% 100%", "100% 0%", "0% 0%"],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                    background: "radial-gradient(circle at 10% 20%, rgba(var(--theme-accent), 0.2) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 40%), radial-gradient(circle at 50% 15%, rgba(168, 85, 247, 0.15) 0%, transparent 50%), radial-gradient(circle at 85% 10%, rgba(236, 72, 153, 0.1) 0%, transparent 40%)",
                    backgroundSize: "300% 300%",
                    filter: "blur(40px)",
                }}
            />

            {/* PREVIOUS COLOR GLOWS */}
            <div className={cn(
                "absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000",
                isEligible ? "bg-yellow-400" : "bg-blue-600"
            )} />
            <div className={cn(
                "absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none transition-colors duration-1000",
                isEligible ? "bg-orange-600" : "bg-purple-600"
            )} />

            {/* CARBON FIBRE OVERLAY FOR TEMPTATION */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                {/* HERO ICON SECTION */}
                <div className="relative shrink-0">
                    <motion.div
                        animate={isEligible ? {
                            rotate: [0, -5, 5, -5, 5, 0],
                            scale: [1, 1.05, 1]
                        } : {}}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className={cn(
                            "w-28 h-28 rounded-[2.2rem] flex items-center justify-center relative overflow-hidden transition-all duration-700",
                            isEligible
                                ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 shadow-[0_0_40px_rgba(234,179,8,0.4)]"
                                : "bg-white/5 border border-white/10"
                        )}
                    >
                        <Gift className={cn("w-12 h-12 transition-colors duration-500", isEligible ? "text-black" : "text-white/20")} />

                        {/* LASER SCAN EFFECT */}
                        <motion.div
                            animate={{ y: [-60, 60] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                            className="absolute inset-x-0 h-[3px] bg-white/40 blur-[2px] pointer-events-none"
                        />
                    </motion.div>

                    {isEligible && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-4 -right-4 bg-white text-black p-2 rounded-2xl shadow-2xl flex items-center justify-center"
                        >
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 animate-[spin_8s_linear_infinite]" />
                        </motion.div>
                    )}
                </div>

                {/* CONTENT & ACTION SECTION */}
                <div className="flex-1 text-center md:text-left min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                        <div className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 mx-auto md:mx-0",
                            isEligible ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30" : "bg-white/5 text-white/40 border border-white/10"
                        )}>
                            {isEligible ? <Zap className="w-3 h-3 fill-current" /> : <Target className="w-3 h-3" />}
                            {isEligible ? "Legendary Bundle Ready" : "Aura Milestone"}
                        </div>
                        {isEligible && (
                            <div className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
                                <span className="text-[10px] font-black text-yellow-400/60 tracking-widest uppercase">Verified Elite</span>
                            </div>
                        )}
                    </div>

                    <h4 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-3 drop-shadow-2xl">
                        Elite Starter Pack
                    </h4>

                    <p className="text-sm font-medium text-white/40 mb-8 max-w-md leading-relaxed">
                        Reach <span className="text-white">Level 3 (300 Aura)</span> to secure your exclusive offline bundle. Includes our limited-edition <span className="text-white italic">Premium T-Shirt</span> and a chilled <span className="text-white italic font-bold">Diet Coke</span>.
                    </p>

                    {isEligible ? (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button className="w-full md:w-auto h-14 px-10 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-[0.2em] hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] group/btn">
                                Claim Your Status <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </motion.div>
                    ) : (
                        <div className="space-y-4 px-1">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Syncing Aura Progress...</p>
                                <p className="text-xs font-black theme-text italic tabular-nums">{Math.floor(progress)}%</p>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 rounded-full relative"
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:15px_15px] animate-[progress-stripe_1s_linear_infinite]" />
                                    <div className="absolute inset-0 shadow-[0_0_20px_rgba(234,179,8,0.5)] blur-[5px]" />
                                </motion.div>
                            </div>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] text-center md:text-left">{aura} / 300 Aura Transmitted</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
