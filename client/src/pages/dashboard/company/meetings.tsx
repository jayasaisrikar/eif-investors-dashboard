import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, Clock, MapPin, Video, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

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

export default function CompanyMeetings() {
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

        // also fetch actual meeting records to get join URLs
        try {
          const recRes = await fetch('/api/users/me/meetings', { credentials: 'include' });
          if (recRes.ok) {
            const recs = await recRes.json();
            setMeetingRecords(recs || []);
          }
        } catch (e) {
          // ignore
        }
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };

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

  // Reschedule dialog state
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleMeetingId, setRescheduleMeetingId] = useState<string | null>(null);
  const [startLocal, setStartLocal] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [endLocal, setEndLocal] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 30, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [meetingRecords, setMeetingRecords] = useState<any[]>([]);
  const [timezoneSel, setTimezoneSel] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  // Scheduling modal (for Accept & Schedule)
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleMeetingId, setScheduleMeetingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [startTimeVal, setStartTimeVal] = useState<string>('09:00');
  const [endTimeVal, setEndTimeVal] = useState<string>('09:30');
  const timezones = [
    'UTC','Europe/London','Europe/Berlin','America/New_York','America/Chicago','America/Los_Angeles','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney'
  ];

  const openReschedule = (meetingId: string) => {
    setRescheduleMeetingId(meetingId);
    // Prefill using an existing meeting record if we have one
    const req = meetings.find(m => m.id === meetingId);
    if (req) {
      const found = meetingRecords.find(r => (r.participant_a_id === req.from_user_id && r.participant_b_id === req.to_user_id) || (r.participant_a_id === req.to_user_id && r.participant_b_id === req.from_user_id));
      if (found) {
        const s = new Date(found.start_time);
        const e = new Date(found.end_time);
        const toLocal = (d: Date) => {
          const tzOffset = d.getTimezoneOffset() * 60000;
          const local = new Date(d.getTime() - tzOffset);
          return local.toISOString().slice(0,16);
        };
        setStartLocal(toLocal(s));
        setEndLocal(toLocal(e));
        setTimezoneSel((found.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC');
      }
    }
    setRescheduleOpen(true);
  };

  const openSchedule = (meetingId: string) => {
    setScheduleMeetingId(meetingId);
    // Prefill date/time from existing meeting record if available
    const req = meetings.find(m => m.id === meetingId);
    if (req) {
      const found = meetingRecords.find(r => (r.participant_a_id === req.from_user_id && r.participant_b_id === req.to_user_id) || (r.participant_a_id === req.to_user_id && r.participant_b_id === req.from_user_id));
      if (found) {
        setSelectedDate(new Date(found.start_time));
        const s = new Date(found.start_time);
        const e = new Date(found.end_time);
        const toTimeInput = (d: Date) => d.toISOString().slice(11,16);
        setStartTimeVal(toTimeInput(s));
        setEndTimeVal(toTimeInput(e));
        setTimezoneSel((found.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC');
      } else {
        // default to tomorrow
        const d = new Date(); d.setDate(d.getDate()+1); setSelectedDate(d);
      }
    }
    setScheduleOpen(true);
  };

  const submitSchedule = async () => {
    if (!scheduleMeetingId || !selectedDate) return;
    try {
      // construct ISO start/end using selectedDate + time inputs
      const [sh, sm] = startTimeVal.split(':').map(Number);
      const [eh, em] = endTimeVal.split(':').map(Number);
      const start = new Date(selectedDate);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(eh, em, 0, 0);
      const tz = timezoneSel || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const res = await fetch(`/api/meetings/requests/${scheduleMeetingId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED', start_time: start.toISOString(), end_time: end.toISOString(), timezone: tz }),
      });
      if (!res.ok) throw new Error('failed to confirm meeting');
      const body = await res.json();
      // update UI: replace meeting request and add meeting record if returned
      if (body.meetingRequest) {
        setMeetings(prev => prev.map(m => (m.id === scheduleMeetingId ? body.meetingRequest : m)));
      }
      if (body.meeting) {
        // refresh meeting records
        try {
          const recRes = await fetch('/api/users/me/meetings', { credentials: 'include' });
          if (recRes.ok) setMeetingRecords(await recRes.json());
        } catch (e) {}
      }
      toast({ title: 'Meeting Scheduled', description: 'Meeting confirmed and calendar event created (if configured).' });
      setScheduleOpen(false);
    } catch (err: any) {
      console.error('schedule error', err);
      toast({ title: 'Schedule Failed', description: 'Could not schedule meeting.' });
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleMeetingId) return;
    try {
      const start = new Date(startLocal).toISOString();
      const end = new Date(endLocal).toISOString();
      const tz = timezoneSel || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch(`/api/meetings/requests/${rescheduleMeetingId}/proposals`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: start, end_time: end, timezone: tz }),
      });
      if (!res.ok) throw new Error('failed to create proposal');
      const proposal = await res.json();
      toast({ title: 'Reschedule Requested', description: 'Investor notified of new proposed time.' });
      setRescheduleOpen(false);
      // Refresh meetings list and meeting records
      try {
        const userRes = await fetch('/api/users/me', { credentials: 'include' });
        const user = await userRes.json();
        const meRes = await fetch(`/api/meetings/requests/${user.id}`, { credentials: 'include' });
        const data = await meRes.json();
        setMeetings(data || []);
        try {
          const recRes = await fetch('/api/users/me/meetings', { credentials: 'include' });
          if (recRes.ok) setMeetingRecords(await recRes.json());
        } catch (e) {}
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      console.error('reschedule error', err);
      toast({ title: 'Reschedule Failed', description: 'Could not send reschedule request.' });
    }
  };

  return (
    <DashboardLayout role="company">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-heading">Meetings</h1>
            <p className="text-muted-foreground">Track pitch meetings and follow-ups.</p>
          </div>
          <Button 
            className="bg-secondary hover:bg-secondary/90"
            onClick={() => toast({ title: "Calendar Synced", description: "Your Outlook Calendar is now connected." })}
          >
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
            <TabsTrigger value="requests">Requests ({pendingMeetings.length})</TabsTrigger>
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
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
                        <span className="text-xs font-medium uppercase">{formatDate(meeting.created_at).split(' ')[0]}</span>
                        <span className="text-xl font-bold">{formatDate(meeting.created_at).split(' ')[1]}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">Scheduled Meeting</h3>
                          <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/10">
                            {meeting.status}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          <p>{meeting.message || "Investor meeting"}</p>
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4" /> Video Meeting
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                      <div className="flex gap-2 ml-auto md:ml-0">
                        <Button 
                          variant="outline" 
                          className="border-white/10 hover:bg-white/5"
                          onClick={() => openReschedule(meeting.id)}
                        >
                          Reschedule
                        </Button>
                        <Button className="bg-secondary hover:bg-secondary/90 text-white" onClick={() => {
                          const found = meetingRecords.find(r => (r.participant_a_id === meeting.from_user_id && r.participant_b_id === meeting.to_user_id) || (r.participant_a_id === meeting.to_user_id && r.participant_b_id === meeting.from_user_id));
                          if (found && found.location_url) {
                            window.open(found.location_url, '_blank');
                          } else {
                            toast({ title: 'No meeting link', description: 'No meeting URL available yet.' });
                          }
                        }}>Join Call</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="requests">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading requests...</p>
            ) : pendingMeetings.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <CalendarIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No pending requests</h3>
                <p className="text-muted-foreground">You're all caught up! Check back later for new meeting requests.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMeetings.map((meeting) => (
                  <Card key={meeting.id} className="bg-card/50 border-white/5">
                    <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">New Meeting Request from Investor</h3>
                        <p className="text-sm text-muted-foreground mb-2">{meeting.message || "Wants to discuss an investment opportunity with your company"}</p>
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/10">NEEDS YOUR RESPONSE</Badge>
                      </div>
                      <div className="flex gap-2 ml-auto md:ml-0">
                        <Button variant="outline" className="border-white/10" onClick={() => handleUpdateMeeting(meeting.id, 'DECLINED')}>Decline</Button>
                        <Button className="bg-secondary hover:bg-secondary/90" onClick={() => openSchedule(meeting.id)}>Accept & Schedule</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Reschedule</DialogTitle>
              <DialogDescription>Pick a new date and time to propose to the participant.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 mt-4">
              <label className="text-sm">Start</label>
              <input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} className="w-full p-2 rounded bg-input text-sm" />
              <label className="text-sm">End</label>
              <input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} className="w-full p-2 rounded bg-input text-sm" />
              <label className="text-sm">Timezone</label>
              <select value={timezoneSel} onChange={(e) => setTimezoneSel(e.target.value)} className="w-full p-2 rounded bg-input text-sm">
                <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>{Intl.DateTimeFormat().resolvedOptions().timeZone}</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
              </select>
            </div>

            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
                <Button onClick={submitReschedule}>Send Proposal</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Meeting</DialogTitle>
              <DialogDescription>Pick a date, time and timezone for this meeting.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm">Date</label>
                <DayPicker mode="single" selected={selectedDate} onSelect={(d) => setSelectedDate(d ?? undefined)} />
              </div>
              <div>
                <label className="text-sm">Start time</label>
                <input type="time" value={startTimeVal} onChange={(e) => setStartTimeVal(e.target.value)} className="w-full p-2 rounded bg-input text-sm" />
                <label className="text-sm mt-2">End time</label>
                <input type="time" value={endTimeVal} onChange={(e) => setEndTimeVal(e.target.value)} className="w-full p-2 rounded bg-input text-sm" />
                <label className="text-sm mt-2">Timezone</label>
                <select value={timezoneSel} onChange={(e) => setTimezoneSel(e.target.value)} className="w-full p-2 rounded bg-input text-sm">
                  {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>

            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
                <Button onClick={submitSchedule}>Confirm & Create</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
