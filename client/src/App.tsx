import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";

// Investor Pages
import InvestorDashboard from "@/pages/dashboard/investor";
import InvestorDiscover from "@/pages/dashboard/investor/discover";
import InvestorMeetings from "@/pages/dashboard/investor/meetings";
import InvestorNetwork from "@/pages/dashboard/investor/network";

// Company Pages
import CompanyDashboard from "@/pages/dashboard/company";
import CompanyInvestors from "@/pages/dashboard/company/investors";
import CompanyMeetings from "@/pages/dashboard/company/meetings";
import CompanyPitch from "@/pages/dashboard/company/pitch";
import CompanyPublicProfile from "@/pages/company/profile";

// Admin Pages
import AdminDashboard from "@/pages/dashboard/admin";
import AdminUsers from "@/pages/dashboard/admin/users";
import AdminSettings from "@/pages/dashboard/admin/settings";

// Shared
import SettingsPage from "@/pages/dashboard/settings";
import ProfilePage from "@/pages/dashboard/profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Investor Routes */}
      <Route path="/dashboard/investor" component={InvestorDashboard} />
      <Route path="/dashboard/investor/discover" component={InvestorDiscover} />
      <Route path="/dashboard/investor/meetings" component={InvestorMeetings} />
      <Route path="/dashboard/investor/network" component={InvestorNetwork} />
      
      {/* Company Routes */}
      <Route path="/dashboard/company" component={CompanyDashboard} />
      <Route path="/dashboard/company/investors" component={CompanyInvestors} />
      <Route path="/dashboard/company/meetings" component={CompanyMeetings} />
      <Route path="/dashboard/company/pitch" component={CompanyPitch} />
      {/* Public company profile (investors) */}
      <Route path="/company/:userId" component={CompanyPublicProfile} />
      
      {/* Admin Routes */}
      <Route path="/dashboard/admin" component={AdminDashboard} />
      <Route path="/dashboard/admin/users" component={AdminUsers} />
      <Route path="/dashboard/admin/settings" component={AdminSettings} />

      {/* Shared Routes */}
      <Route path="/dashboard/settings" component={SettingsPage} />
      <Route path="/dashboard/profile" component={ProfilePage} />
      
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
