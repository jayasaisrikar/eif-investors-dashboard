import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Mail, Linkedin, ExternalLink, MoreHorizontal, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useLocation } from 'wouter';

interface Contact {
  id: string;
  name: string;
  role?: string;
  company?: string;
  status: string;
  lastInteraction?: string;
}

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
}

export default function InvestorNetwork() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        // Get current user
        const userRes = await fetch('/api/users/me', { credentials: 'include' });
        if (!userRes.ok) throw new Error('Could not get current user');
        const user = await userRes.json();

        // Get meeting requests to build network
        const meetingsRes = await fetch(`/api/meetings/requests/${user.id}`, { credentials: 'include' });
        if (!meetingsRes.ok) throw new Error('Could not fetch meetings');
        const meetings: MeetingRequest[] = await meetingsRes.json();

        // Build contacts from confirmed/pending meetings
        const contactMap = new Map<string, Contact>();

        // Collect unique other user ids
        const otherIds = new Set<string>();
        for (const meeting of meetings) {
          const otherUserId = meeting.from_user_id === user.id ? meeting.to_user_id : meeting.from_user_id;
          otherIds.add(otherUserId);
        }

        // Fetch basic user & profile data for each contact in parallel
        const fetchPromises = Array.from(otherIds).map(async (otherId) => {
          try {
            const userRes = await fetch(`/api/users/${otherId}`, { credentials: 'include' });
            const userObj = userRes.ok ? await userRes.json() : null;

            let name = 'Contact';
            let roleLabel: string | undefined = undefined;
            let companyLabel: string | undefined = undefined;

            if (userObj) {
              name = userObj.name ?? userObj.email ?? 'Contact';
              const role = (userObj.role ?? '').toString().toLowerCase();
              if (role.includes('company')) {
                const compRes = await fetch(`/api/companies/${otherId}`, { credentials: 'include' });
                if (compRes.ok) {
                  const comp = await compRes.json();
                  roleLabel = comp.stage ?? 'Company';
                  companyLabel = comp.company_name ?? comp.name ?? undefined;
                }
              } else {
                const invRes = await fetch(`/api/investors/${otherId}`, { credentials: 'include' });
                if (invRes.ok) {
                  const inv = await invRes.json();
                  roleLabel = inv.role ?? undefined;
                  companyLabel = inv.firm ?? undefined;
                }
              }
            }

            return { id: otherId, name, role: roleLabel, company: companyLabel } as Contact;
          } catch (err) {
            console.error('fetch contact error', err);
            return { id: otherId, name: 'Contact', status: 'Unknown' } as Contact;
          }
        });

        const profiles = await Promise.all(fetchPromises);

        for (const meeting of meetings) {
          const otherUserId = meeting.from_user_id === user.id ? meeting.to_user_id : meeting.from_user_id;
          if (!contactMap.has(otherUserId)) {
            const p = profiles.find(x => x.id === otherUserId);
            contactMap.set(otherUserId, {
              id: otherUserId,
              name: p?.name ?? (meeting.from_user_id === user.id ? 'Contact' : 'Contact'),
              role: p?.role,
              company: p?.company,
              status: meeting.status === 'CONFIRMED' ? 'Connected' : 'Pending',
              lastInteraction: formatTimeAgo(meeting.updated_at),
            });
          }
        }

        setContacts(Array.from(contactMap.values()));
      } catch (err) {
        console.error('fetch network error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNetwork();
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const [, setLocation] = useLocation();

  return (
    <DashboardLayout role="investor">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-heading">My Network</h1>
            <p className="text-muted-foreground">Manage your connections and contacts.</p>
          </div>
          <Button onClick={() => toast({ title: "Feature Coming Soon", description: "Manual contact adding will be available soon." })}>Add Contact</Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search connections..." 
            className="pl-9 bg-card/50 border-white/10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Network Grid */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading network...</div>
        ) : filteredContacts.length === 0 ? (
          <Card className="bg-card/50 border-white/5">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No connections yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Your network will grow as you connect with companies. Request meetings to start building your network.
              </p>
              <Button className="mt-4" onClick={() => setLocation('/dashboard/investor/discover')}>
                Discover Companies
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map((person) => (
              <Card key={person.id} className="bg-card/50 border-white/5 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Avatar className="h-16 w-16 border-2 border-white/10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`} />
                      <AvatarFallback>{person.name[0]}</AvatarFallback>
                    </Avatar>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="font-bold text-lg">{person.name}</h3>
                    {person.role && <p className="text-sm text-primary">{person.role}</p>}
                    {person.company && <p className="text-sm text-muted-foreground">{person.company}</p>}
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
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs text-muted-foreground">
                    <span>{person.status}</span>
                    {person.lastInteraction && <span>Last active {person.lastInteraction}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
