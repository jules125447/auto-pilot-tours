import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import CircuitDetail from "./pages/CircuitDetail";
import NavigationView from "./pages/NavigationView";
import Auth from "./pages/Auth";
import MyCircuits from "./pages/MyCircuits";
import CircuitCreator from "./pages/CircuitCreator";
import ProDashboard from "./pages/ProDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/circuit/:id" element={<CircuitDetail />} />
            <Route path="/navigate/:id" element={<NavigationView />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/my-circuits" element={<MyCircuits />} />
            <Route path="/creator" element={<CircuitCreator />} />
            <Route path="/pro" element={<ProDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
