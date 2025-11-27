import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Mail, Linkedin, ExternalLink, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NETWORK = [
  {
    id: 1,
    name: "Sarah Jenkins",
    role: "CEO",
    company: "SolarFlow Tech",
    status: "Connected",
    lastInteraction: "2 days ago",
    avatarSeed: "Sarah"
  },
  {
    id: 2,
    name: "Mike Ross",
    role: "CTO",
    company: "WindScale",
    status: "Connected",
    lastInteraction: "5 hours ago",
    avatarSeed: "Mike"
  },
  {
    id: 3,
    name: "David Chen",
    role: "Founder",
    company: "BatteryX",
    status: "Connected",
    lastInteraction: "1 week ago",
    avatarSeed: "David"
  },
  {
    id: 4,
    name: "Emily Blunt",
    role: "CFO",
    company: "GridGuard",
    status: "Pending",
    lastInteraction: "Request sent yesterday",
    avatarSeed: "Emily"
  }
];

export default function InvestorNetwork() {
  const { toast } = useToast();
  return (
    <DashboardLayout role="investor">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-heading">My Network</h1>
            <p className="text-muted-foreground">Manage your connections and contacts.</p>
          </div>
          <Button onClick={() => toast({ title: "Invite Sent", description: "Invitation email sent to new contact." })}>Add Contact</Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search connections..." className="pl-9 bg-card/50 border-white/10" />
        </div>

        {/* Network Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {NETWORK.map((person) => (
            <Card key={person.id} className="bg-card/50 border-white/5 hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Avatar className="h-16 w-16 border-2 border-white/10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${person.avatarSeed}`} />
                    <AvatarFallback>{person.name[0]}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-bold text-lg">{person.name}</h3>
                  <p className="text-sm text-primary">{person.role} @ {person.company}</p>
                </div>

                <div className="flex gap-2 mb-6">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
                    onClick={() => toast({ title: "Message Sent", description: `Message sent to ${person.name}` })}
                  >
                    <Mail className="w-4 h-4 mr-2" /> Message
                  </Button>
                  <Button size="icon" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                    <Linkedin className="w-4 h-4" />
                  </Button>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs text-muted-foreground">
                  <span>{person.status}</span>
                  <span>Last active {person.lastInteraction}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
