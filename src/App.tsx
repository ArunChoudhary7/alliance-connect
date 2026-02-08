import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SettingsProvider } from "@/hooks/useSettings";
import { ThemeProvider } from "@/theme/themeProvider";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import Create from "./pages/Create";
import Activity from "./pages/Activity";
import Messages from "./pages/Messages";
import SecretRoom from "./pages/SecretRoom";
import Circles from "./pages/Circles";
import CircleDetail from "./pages/CircleDetail";
import Events from "./pages/Events";
import Internships from "./pages/Internships";
import LostFound from "./pages/LostFound";
import Marketplace from "./pages/Marketplace";
import StudyGroups from "./pages/StudyGroups";
import Polls from "./pages/Polls"; // Ensure no curly braces around Polls
import Settings from "./pages/Settings";
import Explore from "./pages/Explore";
import Reels from "./pages/Reels";
import Saved from "./pages/Saved";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <SettingsProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/admin" element={<Admin />} />

                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/create" element={<Create />} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/messages" element={<Messages />} />
                  
                  {/* Fixed Routes */}
                  <Route path="/secret-room" element={<SecretRoom />} />
                  <Route path="/polls" element={<Polls />} />
                  <Route path="/lost-found" element={<LostFound />} />
                  
                  <Route path="/circles" element={<Circles />} />
                  <Route path="/circles/:id" element={<CircleDetail />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/internships" element={<Internships />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/study-groups" element={<StudyGroups />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/reels" element={<Reels />} />
                  <Route path="/saved" element={<Saved />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SettingsProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}