import { DashboardLayout } from "@/components/layout-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, Calendar, DollarSign, PieChart, Users, ArrowRight } from "lucide-react";

export default function InvestorDashboard() {
  const stats = [
    { label: "Capital Deployed", value: "$12.5M", change: "+15%", icon: DollarSign },
    { label: "Active Deals", value: "8", change: "+2", icon: PieChart },
    { label: "Meetings this Week", value: "12", change: "4 today", icon: Calendar },
    { label: "New Matches", value: "24", change: "+12%", icon: Users },
  ];

  const recommendedCompanies = [
    { name: "SolarFlow Tech", sector: "Renewables", stage: "Series A", ask: "$5M", match: "98%" },
    { name: "GridGuard", sector: "Grid Infra", stage: "Seed", ask: "$2M", match: "95%" },
    { name: "HydrogenOne", sector: "Clean Fuels", stage: "Series B", ask: "$15M", match: "92%" },
    { name: "CarbonCapture Co", sector: "CCUS", stage: "Series A", ask: "$8M", match: "89%" },
  ];

  const upcomingMeetings = [
    { company: "SolarFlow Tech", time: "10:00 AM Today", type: "Intro Call" },
    { company: "WindScale", time: "2:00 PM Today", type: "Due Diligence" },
    { company: "BatteryX", time: "11:00 AM Tomorrow", type: "Follow-up" },
  ];

  return (
    <DashboardLayout role="investor">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading">Good morning, Alex</h1>
            <p className="text-muted-foreground">Here's what's happening in your deal flow today.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">Discover Companies</Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Card key={i} className="bg-card/50 border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-500 font-medium">{stat.change}</span> from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-7">
          {/* Recommended Matches */}
          <Card className="col-span-4 bg-card/50 border-white/5">
            <CardHeader>
              <CardTitle>Top Recommended Matches</CardTitle>
              <CardDescription>Based on your investment thesis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendedCompanies.map((company, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer border border-transparent hover:border-primary/20">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-xs">
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{company.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-[10px] h-5 border-white/10 bg-white/5">{company.sector}</Badge>
                          <span>•</span>
                          <span>{company.stage}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary">{company.match} Match</div>
                      <div className="text-xs text-muted-foreground">Ask: {company.ask}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary/80">
                View all matches <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card className="col-span-3 bg-card/50 border-white/5">
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>Your schedule for the next 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {upcomingMeetings.map((meeting, i) => (
                  <div key={i} className="flex items-start gap-4 relative pb-6 last:pb-0">
                    {i !== upcomingMeetings.length - 1 && (
                      <div className="absolute left-[19px] top-8 bottom-0 w-px bg-border" />
                    )}
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 z-10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{meeting.type} with {meeting.company}</p>
                      <p className="text-xs text-muted-foreground mt-1">{meeting.time}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent border-white/10">Reschedule</Button>
                        <Button size="sm" className="h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30 border-none">Join Call</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
