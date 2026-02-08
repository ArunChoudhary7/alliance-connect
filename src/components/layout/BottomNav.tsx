import { Home, Compass, PlusSquare, Film, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: PlusSquare, label: "Create", path: "/create" },
  { icon: Film, label: "Reels", path: "/reels" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 glass-card bottom-nav-shadow border-t border-border/50 px-2 py-2 md:hidden"
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-300",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-xl bg-primary/20"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{ margin: "-8px" }}
                  />
                )}
                <item.icon 
                  className={cn(
                    "h-6 w-6 transition-all duration-300 relative z-10",
                    isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]"
                  )} 
                />
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </motion.nav>
  );
}
