import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Coffee, Sun, Moon, Pizza, Upload, Sparkles, Maximize2, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminMenuUpload } from "@/components/admin/AdminMenuUpload";
import { useAuth } from "@/hooks/useAuth";

export default function MessMenuPage() {
  const [menu, setMenu] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const { profile } = useAuth();

  // AUTH CHECK: Only show upload button if user is an admin
  const isAdmin = profile?.role === 'admin';

  const fetchMenu = async () => {
    const { data } = await supabase
      .from('mess_menu')
      .select('*')
      .eq('day_name', 'Today')
      .maybeSingle();
    setMenu(data);
  };

  useEffect(() => { 
    fetchMenu(); 
  }, []);

  const mealSections = [
    { label: "Breakfast", icon: <Coffee className="text-orange-400" />, items: menu?.breakfast || [] },
    { label: "Lunch", icon: <Sun className="text-yellow-500" />, items: menu?.lunch || [] },
    { label: "Snacks", icon: <Pizza className="text-red-400" />, items: menu?.snacks || [] },
    { label: "Dinner", icon: <Moon className="text-indigo-400" />, items: menu?.dinner || [] },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 mt-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black uppercase tracking-tighter gradient-text leading-none">Daily Mess</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 italic">Alliance Food Court</p>
          </div>
          
          {isAdmin && (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUpload(true)}
              className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-lg shadow-primary/5 hover:bg-primary/20 transition-all"
            >
              <Upload className="h-5 w-5" />
            </motion.button>
          )}
        </div>
        
        {/* Official Menu Source Card (The Brains of the Page) */}
        {menu?.image_url && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowFullMenu(true)}
            className="mb-8 w-full flex items-center justify-between p-5 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20 cursor-pointer group hover:scale-[1.01] transition-all shadow-xl shadow-primary/5"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-2xl group-hover:rotate-12 transition-transform">
                <Maximize2 className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none mb-1">Source of Truth</p>
                <h3 className="text-sm font-black uppercase tracking-tight">View Official Menu</h3>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity pr-2">
               <span className="text-[8px] font-bold uppercase tracking-widest">Enlarge</span>
               <ArrowRight className="h-4 w-4" />
            </div>
          </motion.div>
        )}

        {/* The Meal Summary Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mealSections.map((section, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={section.label} 
              className="glass-card p-6 rounded-[2rem] border-none shadow-lg hover:ring-1 ring-white/10 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-background/50 rounded-xl border border-white/5">{section.icon}</div>
                <h3 className="font-bold uppercase tracking-widest text-[10px]">{section.label}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {section.items?.length > 0 ? section.items.map((item: string) => (
                  <Badge key={item} variant="secondary" className="bg-white/5 uppercase text-[9px] font-bold py-1.5 px-3 border-none text-muted-foreground hover:text-white transition-colors">
                    {item}
                  </Badge>
                )) : (
                  <span className="text-[9px] opacity-20 uppercase font-bold italic tracking-tighter">
                    Check official screenshot...
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Internal Zoom Overlay (Zero Cost AI Analysis Alternative) */}
      <AnimatePresence>
        {showFullMenu && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
            onClick={() => setShowFullMenu(false)}
          >
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-6 w-6" />
            </motion.button>
            <motion.img 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              src={menu.image_url} 
              className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-white/10 object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AdminMenuUpload 
        isOpen={showUpload} 
        onClose={() => setShowUpload(false)} 
        onSuccess={fetchMenu} 
      />
    </AppLayout>
  );
}