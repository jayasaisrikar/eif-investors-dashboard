import { DashboardLayout } from "@/components/layout-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, MousePointerClick, Bookmark, TrendingUp } from "lucide-react";

export default function CompanyDashboard() {
  return (
    <DashboardLayout role="company">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading">Company Overview</h1>
            <p className="text-muted-foreground">Track your fundraising progress and investor interest.</p>
          </div>
          <Button className="bg-secondary hover:bg-secondary/90">Update Pitch Deck</Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profile Views</CardTitle>
              <Eye className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">245</div>
              <p className="text-xs text-muted-foreground mt-1">+20.1% from last month</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deck Downloads</CardTitle>
              <MousePointerClick className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saved By</CardTitle>
              <Bookmark className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18</div>
              <p className="text-xs text-muted-foreground mt-1">Investors tracking you</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Meeting Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground mt-1">3 Pending</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
           {/* Recent Activity */}
           <Card className="bg-card/50 border-white/5">
            <CardHeader>
              <CardTitle>Who's looking at you?</CardTitle>
              <CardDescription>Recent investor activity on your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { firm: "Green Horizon Ventures", action: "viewed your profile", time: "2 hours ago" },
                  { firm: "Energy Capital Partners", action: "downloaded pitch deck", time: "5 hours ago" },
                  { firm: "Future Grid Fund", action: "saved your company", time: "Yesterday" },
                  { firm: "BlackRock Energy", action: "viewed your profile", time: "Yesterday" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded bg-white/5">
                    <div>
                      <span className="font-semibold text-sm">{activity.firm}</span>
                      <span className="text-sm text-muted-foreground"> {activity.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Setup Progress */}
          <Card className="bg-card/50 border-white/5">
            <CardHeader>
              <CardTitle>Profile Strength</CardTitle>
              <CardDescription>Complete your profile to rank higher in search</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">75% Complete</span>
                <span className="text-xs text-muted-foreground">Level: Advanced</span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2.5 mb-6">
                <div className="bg-secondary h-2.5 rounded-full" style={{ width: "75%" }}></div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Upload latest Financials", completed: false },
                  { label: "Add Team Bios", completed: true },
                  { label: "Verify Company Email", completed: true },
                  { label: "Add Customer Testimonials", completed: false },
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${task.completed ? "bg-secondary border-secondary text-white" : "border-muted-foreground"}`}>
                      {task.completed && <TrendingUp className="w-3 h-3" />}
                    </div>
                    <span className={`text-sm ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.label}</span>
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
