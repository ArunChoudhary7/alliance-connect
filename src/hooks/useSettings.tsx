import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const SettingsContext = createContext<any>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ dark_mode: true });

  const applyTheme = useCallback((isDark: boolean) => {
    const root = window.document.documentElement;
    if (isDark) root.classList.add("dark"); else root.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) { setSettings(data); applyTheme(data.dark_mode); }
      });
    }
  }, [user, applyTheme]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting: () => {} }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);