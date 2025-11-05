import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Playbook from "./pages/Playbook";
import Pipeline from "./pages/Pipeline";
import VideoProduction from "./pages/VideoProduction";
import Library from "./pages/Library";
import ViralIntelligence from "./pages/ViralIntelligence";
import ReferenceLibrary from "./pages/ReferenceLibrary";
import Schedule from "./pages/Schedule";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Services from "./pages/Services";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/playbook" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/playbook" element={<Playbook />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/video-production" element={<VideoProduction />} />
          <Route path="/library" element={<Library />} />
          <Route path="/viral-intelligence" element={<ViralIntelligence />} />
          <Route path="/reference-library" element={<ReferenceLibrary />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/services" element={<Services />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
