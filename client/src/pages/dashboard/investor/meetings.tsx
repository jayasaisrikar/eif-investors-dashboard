import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, Clock, MapPin, Video, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MEETINGS = [
  {
    id: 1,
    title: "Intro Call: SolarFlow Tech",
    partner: "Sarah Jenkins (CEO)",
    company: "SolarFlow Tech",
    time: "10:00 AM - 10:30 AM",
    date: "Today, Nov 27",
    type: "Virtual",
    status: "Confirmed",
    link: "zoom.us/j/123456"
  },
  {
    id: 2,
    title: "Due Diligence: WindScale",
    partner: "Mike Ross (CTO)",
    company: "WindScale",
    time: "2:00 PM - 3:00 PM",
    date: "Today, Nov 27",
    type: "Virtual",
    status: "Confirmed",
    link: "meet.google.com/abc-defg"
  },
  {
    id: 3,
    title: "Follow-up: BatteryX",
    partner: "David Chen (Founder)",
    company: "BatteryX",
    time: "11:00 AM - 11:30 AM",
    date: "Tomorrow, Nov 28",
    type: "In Person",
    location: "EIF Lounge A",
    status: "Pending"
  },
  {
    id: 4,
    title: "Intro: GridGuard",
    partner: "Emily Blunt (CFO)",
    company: "GridGuard",
    time: "4:00 PM - 4:30 PM",
    date: "Fri, Nov 29",
    type: "Virtual",
    status: "Confirmed",
    link: "zoom.us/j/987654"
  }
];

export default function InvestorMeetings() {
  return (
    <DashboardLayout role="investor">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-heading">Meetings</h1>
            <p className="text-muted-foreground">Manage your schedule and upcoming calls.</p>
          </div>
          <Button>
            <CalendarIcon className="w-4 h-4 mr-2" />
            Sync Calendar
          </Button>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full md:w-auto bg-card/50 border border-white/5 p-1">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {MEETINGS.map((meeting) => (
              <Card key={meeting.id} className="bg-card/50 border-white/5 hover:bg-white/[0.02] transition-colors">
                <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <span className="text-xs font-medium uppercase">{meeting.date.split(',')[0]}</span>
                      <span className="text-xl font-bold">{meeting.date.split(' ')[2]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{meeting.title}</h3>
                        <Badge variant="outline" className={`
                          ${meeting.status === 'Confirmed' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'}
                        `}>
                          {meeting.status}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" /> {meeting.time}
                        </div>
                        <div className="flex items-center gap-2">
                          {meeting.type === 'Virtual' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                          {meeting.type === 'Virtual' ? 'Virtual Meeting' : meeting.location}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                     <div className="flex items-center gap-3 mr-4">
                      <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${meeting.partner}`} />
                        <AvatarFallback>{meeting.partner[0]}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <div className="font-medium text-foreground">{meeting.partner}</div>
                        <div className="text-muted-foreground">{meeting.company}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-auto md:ml-0">
                      <Button variant="outline" className="border-white/10 hover:bg-white/5">Reschedule</Button>
                      <Button className="bg-primary hover:bg-primary/90">Join</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="pending">
            <div className="text-center py-12 text-muted-foreground">No pending meeting requests.</div>
          </TabsContent>
          
           <TabsContent value="past">
            <div className="text-center py-12 text-muted-foreground">No past meetings to show.</div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
