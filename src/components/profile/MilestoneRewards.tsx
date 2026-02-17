import { motion } from "framer-motion";
import { Gift, ArrowRight, Zap, Star, Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MilestoneRewardsProps {
    aura: number;
    variant?: "compact" | "full";
}

export function MilestoneRewards({ aura, variant = "full" }: MilestoneRewardsProps) {
    const isEligible = aura >= 300;
    const progress = Math.min(100, (aura / 300) * 100);
    const isCompact = variant === "compact";

    if (isCompact) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-2 pb-2"
            >
                <div className="bg-rose-500/10 border-2 border-rose-400 rounded-3xl p-4 shadow-[0_8px_20px_-10px_rgba(244,63,94,0.3)]">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            {isEligible ? "Special Gift Ready!" : "Keep posting and unlock gifts"}
                        </p>
                        <span className="text-[10px] font-black text-rose-500 tabular-nums bg-white/10 px-2 py-0.5 rounded-full ring-1 ring-rose-500/20">
                            {Math.floor(progress)}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-rose-500/10 p-[1px]">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                        />
                    </div>
                    <p className="text-[9px] font-bold text-rose-400 mt-2 uppercase tracking-tight text-center leading-tight">
                        Reach 300 Aura to unlock a <span className="text-white">T-Shirt</span> and <span className="text-white">Diet Coke</span>
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "relative overflow-hidden rounded-[2rem] p-4 md:p-6 transition-all duration-500 max-w-sm mx-auto",
                "bg-rose-500/5 border-2",
                isEligible
                    ? "border-rose-400 shadow-[20px_20px_60px_rgba(244,63,94,0.1)] bg-rose-500/10"
                    : "border-rose-500/30 shadow-lg"
            )}
        >
            {/* CUTE DECORATIVE ELEMENTS */}
            <div className="absolute top-0 right-0 p-3 opacity-10 blur-sm pointer-events-none">
                <Heart className="w-12 h-12 text-rose-400 rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center gap-2">
                {/* THE CUTE GIFT BOX ICON - EVEN SMALLER */}
                <div className="relative">
                    <motion.div
                        animate={isEligible ? {
                            y: [0, -6, 0],
                            rotate: [0, -5, 5, 0]
                        } : {}}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center relative shadow-xl transition-all duration-700",
                            isEligible
                                ? "bg-rose-500 text-white ring-2 ring-rose-400/30"
                                : "bg-rose-500/20 text-rose-500/60 border border-rose-500/20"
                        )}
                    >
                        <Gift className="w-6 h-6 drop-shadow-lg" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-white/10" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-white/10" />
                    </motion.div>

                    {isEligible && (
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className="absolute -top-1 -right-1 bg-yellow-400 text-black p-0.5 rounded-lg shadow-xl border border-white"
                        >
                            <Star className="w-2.5 h-2.5 fill-current" />
                        </motion.div>
                    )}
                </div>

                <div className="space-y-0.5">
                    <h4 className="text-sm font-black uppercase italic tracking-tighter text-rose-500 leading-none">
                        {isEligible ? "Gift Unlocked!" : "Keep posting and unlock gifts"}
                    </h4>
                    <p className="text-[10px] font-bold text-rose-400/60 max-w-[150px] leading-tight">
                        {isEligible
                            ? "T-Shirt & Coke Bundle is yours!"
                            : "300 Aura = Exclusive Gear."}
                    </p>
                </div>

                {/* PROGRESS SECTION */}
                {!isEligible ? (
                    <div className="w-full space-y-2 mt-1">
                        <div className="flex justify-between items-end px-1">
                            <span className="text-[7px] font-black uppercase tracking-widest text-rose-500/40">Broadcasting...</span>
                            <span className="text-[9px] font-black text-rose-500 italic">{Math.floor(progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.3)] relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[progress-stripe_1s_linear_infinite]" />
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    <Button className="w-full h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[8px] tracking-widest shadow-lg group transition-all">
                        Claim Gear <ArrowRight className="ml-1 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                )}
            </div>
        </motion.div>
    );
}
