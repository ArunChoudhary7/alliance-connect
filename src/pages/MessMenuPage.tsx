import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Coffee, Sun, Moon, Pizza, Upload, Maximize2, X, ArrowRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminMenuUpload } from "@/components/admin/AdminMenuUpload";
import { useAuth } from "@/hooks/useAuth";

export default function MessMenuPage() {
  const [menu, setMenu] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const fetchMenu = async () => {
    const { data } = await supabase
      .from('mess_menu')
      .select('*')
      .eq('day_name', 'Today')
      .maybeSingle();
    setMenu(data);
  };

  useEffect(() => { fetchMenu(); }, []);

  const mealSections = [
    { label: "Breakfast", icon: <Coffee className="text-orange-400" />, items: menu?.breakfast || [] },
    { label: "Lunch", icon: <Sun className="text-yellow-500" />, items: menu?.lunch || [] },
    { label: "Snacks", icon: <Pizza className="text-red-400" />, items: menu?.snacks || [] },
    { label: "Dinner", icon: <Moon className="text-indigo-400" />, items: menu?.dinner || [] },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 pb-24">
        <div className="flex justify-between items-center mb-6 mt-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black uppercase tracking-tighter gradient-text leading-none">Mess Compass</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 italic">
              Today&apos;s fuel for {profile?.username || "campus"}
            </p>
          </div>
          {isAdmin && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-2xl text-primary text-[10px] font-black uppercase tracking-widest"
            >
              <Upload className="h-4 w-4" />
              Update Menu
            </motion.button>
          )}
        </div>

        {/* TODAY SUMMARY + IMAGE PREVIEW */}
        <div className="grid gap-4 mb-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">


          {menu?.image_url ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowFullMenu(true)}
              className="w-full flex items-center justify-between p-4 rounded-[2rem] bg-secondary/20 border border-secondary/40 cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-secondary/40 rounded-2xl">
                  <Maximize2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Official Menu</p>
                  <h3 className="text-xs font-bold uppercase tracking-tight">Tap to view full image</h3>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </motion.div>
          ) : (
            <div className="p-4 rounded-[2rem] bg-secondary/10 border border-white/5 flex items-center gap-3 opacity-80">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                No menu uploaded for today
              </span>
            </div>
          )}
        </div>

        {/* MEAL SECTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mealSections.map((section) => (
            <motion.div key={section.label} className="glass-card p-6 rounded-[2rem] border-none shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-background/50 rounded-xl border border-white/5">{section.icon}</div>
                <h3 className="font-bold uppercase tracking-widest text-[10px]">{section.label}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {section.items && section.items.length > 0 ? (
                  section.items.map((item: string, i: number) => (
                    <Badge key={i} variant="secondary" className="bg-white/5 uppercase text-[9px] font-bold py-1.5 px-3 border-none text-muted-foreground">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[9px] opacity-40 uppercase font-bold italic">
                    {menu?.image_url ? "Tap Image for Details" : "Not updated"}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FULL SCREEN IMAGE OVERLAY */}
      <AnimatePresence>
        {showFullMenu && menu?.image_url && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setShowFullMenu(false)}
          >
            <button className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white"><X className="h-6 w-6" /></button>
            <img
              src={menu.image_url}
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AdminMenuUpload isOpen={showUpload} onClose={() => setShowUpload(false)} onSuccess={fetchMenu} />
    </AppLayout>
  );
}