import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Portfolio from "@/pages/Portfolio";
import Sectors from "@/pages/Sectors";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "./pages/NotFound.tsx";
import ChartTerminal from "./pages/ChartTerminal.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Auth Routes */}
            <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
            <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />

            {/* Root: Landing or Redirect to Dashboard */}
            <Route path="/" element={
              <>
                <SignedIn><Navigate to="/dashboard" replace /></SignedIn>
                <SignedOut><LandingPage /></SignedOut>
              </>
            } />

            {/* Application Shell (Protected) */}
            <Route element={
              <>
                <SignedIn><AppLayout /></SignedIn>
                <SignedOut><RedirectToSignIn /></SignedOut>
              </>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/sectors" element={<Sectors />} />
              <Route path="/chart/:symbol" element={<ChartTerminal />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
