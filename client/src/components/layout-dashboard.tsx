import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Calendar, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

type Role = "investor" | "company" | "admin";

export function DashboardLayout({ 
  children, 
  role = "investor" 
}: { 
  children: React.ReactNode; 
  role?: Role 
}) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = {
    investor: [
      { icon: LayoutDashboard, label: "Overview", href: "/dashboard/investor" },
      { icon: Search, label: "Discover Companies", href: "/dashboard/investor/discover" },
      { icon: Calendar, label: "Meetings", href: "/dashboard/investor/meetings" },
      { icon: Users, label: "My Network", href: "/dashboard/investor/network" },
    ],
    company: [
      { icon: LayoutDashboard, label: "Overview", href: "/dashboard/company" },
      { icon: Users, label: "Find Investors", href: "/dashboard/company/investors" },
      { icon: Calendar, label: "Meetings", href: "/dashboard/company/meetings" },
      { icon: Briefcase, label: "Pitch Deck", href: "/dashboard/company/pitch" },
    ],
    admin: [
      { icon: LayoutDashboard, label: "Admin Overview", href: "/dashboard/admin" },
      { icon: Users, label: "User Management", href: "/dashboard/admin/users" },
      { icon: Settings, label: "System Settings", href: "/dashboard/admin/settings" },
    ]
  };

  const items = navItems[role];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
        `}
      >
        <div className="p-6 flex items-center gap-2 border-b border-sidebar-border h-16">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
            E
          </div>
          <span className="font-bold font-heading text-lg">EIF Investor Portal</span>
        </div>

        <div className="py-6 px-3 space-y-1">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${location === item.href 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"}
              `}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            </Link>
          ))}
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t border-sidebar-border">
          <Link href="/dashboard/settings">
             <a className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </a>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            {/* Search Bar - Desktop */}
            <div className="hidden md:flex items-center relative max-w-md w-64">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-9 bg-secondary/10 border-transparent focus-visible:ring-primary h-9" 
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full"></span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">John Doe</p>
                    <p className="text-xs leading-none text-muted-foreground">john@example.com</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/dashboard/profile">
                  <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                </Link>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <Link href="/dashboard/settings">
                  <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setLocation("/")}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
