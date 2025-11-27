import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, Clock, MapPin, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MEETINGS = [
  {
    id: 1,
    title: "Intro Call: Green Horizon",
    partner: "Alice Wong (Partner)",
    firm: "Green Horizon Ventures",
    time: "10:00 AM - 10:30 AM",
    date: "Today, Nov 27",
    type: "Virtual",
    status: "Confirmed",
    link: "zoom.us/j/123456",
    location: "Zoom"
  },
  {
    id: 2,
    title: "Follow-up: ECP",
    partner: "Robert Miller (Associate)",
    firm: "Energy Capital Partners",
    time: "2:00 PM - 3:00 PM",
    date: "Today, Nov 27",
    type: "Virtual",
    status: "Confirmed",
    link: "meet.google.com/abc-defg",
    location: "Google Meet"
  }
];

export default function CompanyMeetings() {
  return (
    <DashboardLayout role="company">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-heading">Meetings</h1>
            <p className="text-muted-foreground">Track pitch meetings and follow-ups.</p>
          </div>
          <Button className="bg-secondary hover:bg-secondary/90">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Sync Calendar
          </Button>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full md:w-auto bg-card/50 border border-white/5 p-1">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="requests">Requests (3)</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {MEETINGS.map((meeting) => (
              <Card key={meeting.id} className="bg-card/50 border-white/5 hover:bg-white/[0.02] transition-colors">
                <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
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
                        <div className="text-muted-foreground">{meeting.firm}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-auto md:ml-0">
                      <Button variant="outline" className="border-white/10 hover:bg-white/5">Reschedule</Button>
                      <Button className="bg-secondary hover:bg-secondary/90 text-white">Join</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="requests">
             <Card className="bg-card/50 border-white/5 p-8 text-center">
               <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                 <CalendarIcon className="w-6 h-6 text-muted-foreground" />
               </div>
               <h3 className="text-lg font-medium mb-2">You have 3 pending meeting requests</h3>
               <p className="text-muted-foreground mb-4">Review them to fill your schedule.</p>
               <Button variant="outline">Review Requests</Button>
             </Card>
          </TabsContent>
          
           <TabsContent value="past">
            <div className="text-center py-12 text-muted-foreground">No past meetings to show.</div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
