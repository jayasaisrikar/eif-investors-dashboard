import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, Clock, MapPin, Video, MoreVertical, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface MeetingRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_role: string;
  to_role: string;
  message?: string;
  status: string;
  created_at: string;
  updated_at: string;
  time_proposals_eif?: any[];
}

export default function InvestorMeetings() {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        // Get current user to get their ID
        const userRes = await fetch('/api/users/me', { credentials: 'include' });
        if (!userRes.ok) throw new Error('Could not get current user');
        const user = await userRes.json();
        setCurrentUserId(user.id ?? null);

        // Get meeting requests for this user
        const meRes = await fetch(`/api/meetings/requests/${user.id}`, { credentials: 'include' });
        if (!meRes.ok) throw new Error('Could not fetch meetings');
        const data = await meRes.json();
        setMeetings(data || []);
      } catch (err: any) {
        console.error('fetch meetings error', err);
        setError(err?.message || 'Failed to load meetings');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const upcomingMeetings = meetings.filter(m => m.status === 'CONFIRMED');
  const pendingMeetings = meetings.filter(m => m.status === 'PENDING');

  const handleUpdateMeeting = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/meetings/requests/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('failed to update meeting');
      const updated = await res.json();
      setMeetings(prev => prev.map(m => (m.id === id ? updated : m)));
      toast({ title: 'Meeting Updated', description: `Meeting ${status.toLowerCase()}` });
    } catch (err: any) {
      console.error('update meeting error', err);
      toast({ title: 'Update Failed', description: 'Could not update meeting status.' });
    }
  };

  const handleAcceptProposal = async (meetingId: string, proposalId: string) => {
    try {
      const res = await fetch(`/api/meetings/requests/${meetingId}/proposals/${proposalId}/accept`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('failed to accept proposal');
      const data = await res.json();
      toast({ title: 'Proposal Accepted', description: 'Meeting rescheduled.' });
      // refresh meetings
      const userRes = await fetch('/api/users/me', { credentials: 'include' });
      const user = await userRes.json();
      const meRes = await fetch(`/api/meetings/requests/${user.id}`, { credentials: 'include' });
      const meetingsData = await meRes.json();
      setMeetings(meetingsData || []);
    } catch (err: any) {
      console.error('accept proposal error', err);
      toast({ title: 'Accept Failed', description: 'Could not accept proposal.' });
    }
  };

  const handleDeclineProposal = async (meetingId: string, proposalId: string) => {
    try {
      const res = await fetch(`/api/meetings/requests/${meetingId}/proposals/${proposalId}/decline`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('failed to decline proposal');
      toast({ title: 'Proposal Declined', description: 'The proposer has been notified.' });
      const userRes = await fetch('/api/users/me', { credentials: 'include' });
      const user = await userRes.json();
      const meRes = await fetch(`/api/meetings/requests/${user.id}`, { credentials: 'include' });
      const meetingsData = await meRes.json();
      setMeetings(meetingsData || []);
    } catch (err: any) {
      console.error('decline proposal error', err);
      toast({ title: 'Decline Failed', description: 'Could not decline proposal.' });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  return (
    <DashboardLayout role="investor">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-heading">Meetings</h1>
            <p className="text-muted-foreground">Manage your schedule and upcoming calls.</p>
          </div>
          <Button onClick={() => toast({ title: "Calendar Synced", description: "Your Google Calendar is now connected." })}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            Sync Calendar
          </Button>
        </div>

        {error && (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full md:w-auto bg-card/50 border border-white/5 p-1">
            <TabsTrigger value="upcoming">Upcoming ({upcomingMeetings.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending Requests ({pendingMeetings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading meetings...</p>
            ) : upcomingMeetings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No upcoming meetings scheduled.</div>
            ) : (
              upcomingMeetings.map((meeting) => (
                <Card key={meeting.id} className="bg-card/50 border-white/5 hover:bg-white/[0.02] transition-colors">
                  <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <span className="text-xs font-medium uppercase">{formatDate(meeting.created_at).split(' ')[0]}</span>
                        <span className="text-xl font-bold">{formatDate(meeting.created_at).split(' ')[1]}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">Meeting Request</h3>
                          <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/10">
                            {meeting.status}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          <p>{meeting.message || "Meeting request from investor"}</p>
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4" /> Video Meeting
                          </div>
                          {meeting.time_proposals_eif && meeting.time_proposals_eif.length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium">Reschedule Proposals</h4>
                              <div className="space-y-2 mt-2">
                                {meeting.time_proposals_eif.map((p: any) => (
                                  <div key={p.id} className="flex items-center justify-between gap-2 bg-muted p-2 rounded">
                                    <div className="text-sm">{new Date(p.start_time).toLocaleString()} — {new Date(p.end_time).toLocaleString()} <span className="text-xs text-muted-foreground">({p.status})</span></div>
                                    <div className="flex gap-2">
                                      {currentUserId && p.proposed_by_user_id !== currentUserId && p.status === 'PENDING' && (
                                        <>
                                          <Button size="sm" variant="outline" onClick={() => handleDeclineProposal(meeting.id, p.id)}>Decline</Button>
                                          <Button size="sm" onClick={() => handleAcceptProposal(meeting.id, p.id)}>Accept</Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                      <div className="flex gap-2 ml-auto md:ml-0">
                        <Button 
                          variant="outline" 
                          className="border-white/10 hover:bg-white/5"
                          onClick={() => toast({ title: "Reschedule Request", description: "Availability options sent to participant." })}
                        >
                          Reschedule
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90">Join Call</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="pending">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading requests...</p>
            ) : pendingMeetings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No pending meeting requests.</div>
            ) : (
              <div className="space-y-4">
                {pendingMeetings.map((meeting) => (
                  <Card key={meeting.id} className="bg-card/50 border-white/5">
                    <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg mb-2">New Meeting Request</h3>
                        <p className="text-sm text-muted-foreground">{meeting.message || "Wants to discuss an investment opportunity"}</p>
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/10 mt-2">PENDING RESPONSE</Badge>
                      </div>
                        <div className="flex gap-2 ml-auto md:ml-0">
                          {currentUserId && meeting.to_user_id === currentUserId ? (
                            <>
                              <Button variant="outline" className="border-white/10" onClick={() => handleUpdateMeeting(meeting.id, 'DECLINED')}>Decline</Button>
                              <Button className="bg-primary hover:bg-primary/90" onClick={() => handleUpdateMeeting(meeting.id, 'CONFIRMED')}>Accept</Button>
                            </>
                          ) : (
                            // If current user is the requester, show a non-action label or allow cancel
                            <Button variant="ghost" className="opacity-70" onClick={() => toast({ title: 'Request Sent', description: 'Waiting for the recipient to respond.' })}>Awaiting response</Button>
                          )}
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
