import { DashboardLayout } from "@/components/layout-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Eye, MousePointerClick, Bookmark, TrendingUp, CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from 'date-fns';

interface CompanyProfile {
  user_id?: string;
  company_name?: string;
  sector?: string;
  stage?: string;
  description?: string;
  logo_url?: string;
  pitch_deck_url?: string;
  team_bios?: string;
  customer_testimonials?: string;
  financials_url?: string;
}

interface Metrics {
  profileViews?: { current: number; previous: number; changePercent: number };
  deckDownloads?: { current: number; previous: number; changePercent: number };
  savedBy?: { total: number };
  meetingRequests?: { total: number; pending: number };
}

export default function CompanyDashboard() {
  const [, setLocation] = useLocation();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [companyData, setCompanyData] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, companyRes] = await Promise.all([
          fetch('/api/metrics/company/overview', { credentials: 'include' }),
          fetch('/api/companies/me', { credentials: 'include' }),
        ]);

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data);
        }

        if (companyRes.ok) {
          const data = await companyRes.json();
          setCompanyData(data);
        }
      } catch (err) {
        console.error('fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Calculate profile completion based on actual company data
  const getProfileTasks = () => {
    return [
      { label: "Upload Pitch Deck", completed: !!companyData?.pitch_deck_url },
      { label: "Add Team Bios", completed: !!companyData?.team_bios },
      { label: "Add Company Description", completed: !!companyData?.description },
      { label: "Add Logo", completed: !!companyData?.logo_url },
    ];
  };

  const profileTasks = getProfileTasks();
  const completedTasks = profileTasks.filter(t => t.completed).length;
  const completionPercent = Math.round((completedTasks / profileTasks.length) * 100);

  return (
    <DashboardLayout role="company">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading">{companyData?.company_name || "Company"} Overview</h1>
            <p className="text-muted-foreground">Track your fundraising progress and investor interest.</p>
          </div>
          <Button className="bg-secondary hover:bg-secondary/90" onClick={() => setLocation('/dashboard/company/pitch')}>Update Pitch Deck</Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profile Views</CardTitle>
              <Eye className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : (metrics?.profileViews?.current ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">{loading ? '' : `${metrics?.profileViews?.changePercent?.toFixed(1) || 0}% from last month`}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deck Downloads</CardTitle>
              <MousePointerClick className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : (metrics?.deckDownloads?.current ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">{loading ? '' : `${metrics?.deckDownloads?.changePercent?.toFixed(1) || 0}% from last month`}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saved By</CardTitle>
              <Bookmark className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : (metrics?.savedBy?.total ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Investors tracking you</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Meeting Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : (metrics?.meetingRequests?.total ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">{loading ? '' : `${metrics?.meetingRequests?.pending ?? 0} Pending`}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
           {/* Recent Activity */}
           <Card className="bg-card/50 border-white/5">
            <CardHeader>
              <CardTitle>Investor Interest</CardTitle>
              <CardDescription>Summary of recent investor activity on your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading activity...</div>
                ) : (metrics?.profileViews?.current ?? 0) === 0 && (metrics?.deckDownloads?.current ?? 0) === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    No recent activity. Complete your profile to attract more investors.
                  </div>
                ) : (
                  <>
                    {(metrics?.profileViews?.current ?? 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded bg-white/5">
                        <div className="flex items-center gap-3">
                          <Eye className="w-4 h-4 text-secondary" />
                          <span className="text-sm">{metrics?.profileViews?.current} profile views this month</span>
                        </div>
                      </div>
                    )}
                    {(metrics?.deckDownloads?.current ?? 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded bg-white/5">
                        <div className="flex items-center gap-3">
                          <MousePointerClick className="w-4 h-4 text-secondary" />
                          <span className="text-sm">{metrics?.deckDownloads?.current} deck downloads this month</span>
                        </div>
                      </div>
                    )}
                    {(metrics?.meetingRequests?.pending ?? 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded bg-white/5">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-4 h-4 text-secondary" />
                          <span className="text-sm">{metrics?.meetingRequests?.pending} pending meeting requests</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setLocation('/dashboard/company/meetings')}>
                          View
                        </Button>
                      </div>
                    )}
                  </>
                )}
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
                <span className="text-sm font-medium">{completionPercent}% Complete</span>
                <span className="text-xs text-muted-foreground">
                  {completionPercent >= 75 ? 'Level: Advanced' : completionPercent >= 50 ? 'Level: Intermediate' : 'Level: Beginner'}
                </span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2.5 mb-6">
                <div className="bg-secondary h-2.5 rounded-full transition-all duration-300" style={{ width: `${completionPercent}%` }}></div>
              </div>

              <div className="space-y-3">
                {profileTasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-secondary" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
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

