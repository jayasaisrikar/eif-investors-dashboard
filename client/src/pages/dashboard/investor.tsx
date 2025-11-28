import { DashboardLayout } from "@/components/layout-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, Calendar, DollarSign, PieChart, Users, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface InvestorProfile {
  user_id?: string;
  full_name?: string;
  firm?: string;
  aum?: string;
}

interface InvestorMetrics {
  activeDeals?: number;
  meetingsThisWeek?: number;
  newMatches?: number;
}

interface RecommendedCompany {
  user_id?: string;
  company_name?: string;
  sector?: string;
  stage?: string;
  funding_ask?: string;
  matchScore?: {
    overall: number;
    factors: {
      sector: number;
      stage: number;
      ticketSize: number;
      geography: number;
      investorType: number;
    };
    confidence: 'high' | 'medium' | 'low';
  };
}

interface Meeting {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message?: string;
  status: string;
  created_at: string;
}

export default function InvestorDashboard() {
  const [, setLocation] = useLocation();
  const [investorData, setInvestorData] = useState<InvestorProfile | null>(null);
  const [loadingInvestor, setLoadingInvestor] = useState(true);
  const [metrics, setMetrics] = useState<InvestorMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedCompany[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [investorRes, metricsRes, recsRes, meetingsRes] = await Promise.all([
          fetch('/api/investors/me', { credentials: 'include' }),
          fetch('/api/metrics/investor/overview', { credentials: 'include' }),
          fetch('/api/investors/me/recommendations', { credentials: 'include' }),
          fetch('/api/investors/me/meetings', { credentials: 'include' }),
        ]);

        if (investorRes.ok) {
          const data = await investorRes.json();
          setInvestorData(data);
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data);
        }

        if (recsRes.ok) {
          const data = await recsRes.json();
          setRecommendations(data || []);
        }

        if (meetingsRes.ok) {
          const data = await meetingsRes.json();
          setUpcomingMeetings(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch investor data:', err);
      } finally {
        setLoadingInvestor(false);
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { label: "Active Deals", value: metrics?.activeDeals?.toString() ?? "—", change: "", icon: PieChart },
    { label: "Meetings this Week", value: metrics?.meetingsThisWeek?.toString() ?? "—", change: "", icon: Calendar },
    { label: "New Matches", value: metrics?.newMatches?.toString() ?? "—", change: "", icon: Users },
  ];

  const firstName = investorData?.full_name?.split(' ')[0] || "Investor";

  const formatMeetingTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (isToday) return `${timeStr} Today`;
    if (isTomorrow) return `${timeStr} Tomorrow`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${timeStr}`;
  };

  return (
    <DashboardLayout role="investor">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading">Good morning, {firstName}</h1>
            <p className="text-muted-foreground">Here's what's happening in your deal flow today.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setLocation('/dashboard/investor/discover')}>Discover Companies</Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, i) => (
            <Card key={i} className="bg-card/50 border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loadingData ? '—' : stat.value}</div>
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
                {loadingData ? (
                  <div className="text-sm text-muted-foreground">Loading recommendations...</div>
                ) : recommendations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recommendations yet. Update your investment preferences to see matches.</div>
                ) : (
                  recommendations.map((company, i) => (
                    <div key={company.user_id || i} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer border border-transparent hover:border-primary/20">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-xs">
                          {(company.company_name || '??').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{company.company_name || 'Unknown Company'}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-[10px] h-5 border-white/10 bg-white/5">{company.sector || 'N/A'}</Badge>
                            <span>•</span>
                            <span>{company.stage || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-xs text-muted-foreground">Ask: {company.funding_ask || 'TBD'}</div>
                        {company.matchScore && (
                          <Badge className="bg-primary/20 text-primary border-0" variant="outline">
                            {company.matchScore.overall}% Match
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary/80" onClick={() => setLocation('/dashboard/investor/discover')}>
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
                {loadingData ? (
                  <div className="text-sm text-muted-foreground">Loading meetings...</div>
                ) : upcomingMeetings.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No upcoming meetings scheduled.</div>
                ) : (
                  upcomingMeetings.map((meeting, i) => (
                    <div key={meeting.id} className="flex items-start gap-4 relative pb-6 last:pb-0">
                      {i !== upcomingMeetings.length - 1 && (
                        <div className="absolute left-[19px] top-8 bottom-0 w-px bg-border" />
                      )}
                      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 z-10">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Meeting</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatMeetingTime(meeting.created_at)}</p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent border-white/10">Reschedule</Button>
                          <Button size="sm" className="h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30 border-none">Join Call</Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
