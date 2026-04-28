import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import SplashScreen from "@/components/SplashScreen";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Students from "./pages/Students";
import Topics from "./pages/Topics";
import TopicDetail from "./pages/TopicDetail";
import Tests from "./pages/Tests";
import TestEdit from "./pages/TestEdit";
import TestTake from "./pages/TestTake";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Shell = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("splashShown"));

  useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => sessionStorage.setItem("splashShown", "1"), 100);
    return () => clearTimeout(t);
  }, [showSplash]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Shell><Index /></Shell>} />
                <Route path="/students" element={<Shell><Students /></Shell>} />
                <Route path="/topics" element={<Shell><Topics /></Shell>} />
                <Route path="/topics/:id" element={<Shell><TopicDetail /></Shell>} />
                <Route path="/tests" element={<Shell><Tests /></Shell>} />
                <Route path="/tests/:id/edit" element={<Shell><TestEdit /></Shell>} />
                <Route path="/tests/:id/take" element={<Shell><TestTake /></Shell>} />
                <Route path="/settings" element={<Shell><Settings /></Shell>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
