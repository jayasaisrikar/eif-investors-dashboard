import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import InvestorDashboard from "@/pages/dashboard/investor";
import CompanyDashboard from "@/pages/dashboard/company";
import AdminDashboard from "@/pages/dashboard/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard/investor" component={InvestorDashboard} />
      <Route path="/dashboard/company" component={CompanyDashboard} />
      <Route path="/dashboard/admin" component={AdminDashboard} />
      
      {/* Sub-routes (mocked for now to prevent 404s on sidebar clicks) */}
      <Route path="/dashboard/investor/:any*" component={InvestorDashboard} />
      <Route path="/dashboard/company/:any*" component={CompanyDashboard} />
      <Route path="/dashboard/admin/:any*" component={AdminDashboard} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
