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
      <div className="max-w-2xl mx-auto px-4 pb-24">
        <div className="flex justify-between items-center mb-8 mt-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black uppercase tracking-tighter gradient-text leading-none">Daily Mess</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 italic">Alliance Food Court</p>
          </div>
          {isAdmin && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowUpload(true)} className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Upload className="h-5 w-5" />
            </motion.button>
          )}
        </div>

        {/* IMAGE PREVIEW CARD */}
        {menu?.image_url ? (
          <motion.div 
            onClick={() => setShowFullMenu(true)}
            className="mb-8 w-full flex items-center justify-between p-5 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20 cursor-pointer shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-2xl"><Maximize2 className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none mb-1">Official Source</p>
                <h3 className="text-sm font-black uppercase tracking-tight">View Full Menu Image</h3>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 opacity-50" />
          </motion.div>
        ) : (
          <div className="mb-8 p-6 rounded-[2.5rem] bg-secondary/10 border border-white/5 flex items-center gap-3 opacity-50">
             <AlertTriangle className="h-5 w-5" />
             <span className="text-xs font-bold uppercase">No Menu Uploaded Yet</span>
          </div>
        )}

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
                  <span className="text-[9px] opacity-20 uppercase font-bold italic">Checking...</span>
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