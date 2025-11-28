import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Search, Filter, MapPin, DollarSign, Briefcase, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Company = {
  user_id?: string;
  id?: string | number;
  name?: string;
  sector?: string;
  stage?: string;
  location?: string;
  ask?: string;
  description?: string;
  tags?: string[] | string | null;
  match?: string;
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
};

export default function InvestorDiscover() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;
  const searchRef = useRef<number | undefined>(undefined as any);

  async function fetchCompanies() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sector) params.set('sector', sector);
      if (stage) params.set('stage', stage);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/companies?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();
      // support both shapes: new { items, total } or legacy array response
      if (Array.isArray(payload)) {
        setCompanies(payload as Company[]);
        setTotal((payload as Company[]).length ?? 0);
      } else {
        setCompanies((payload.items ?? []) as Company[]);
        setTotal(payload.total ?? 0);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // debounce search changes
    if (searchRef.current) window.clearTimeout(searchRef.current as any);
    searchRef.current = window.setTimeout(() => {
      setPage(1);
      fetchCompanies();
    }, 350) as unknown as number;
    return () => { if (searchRef.current) window.clearTimeout(searchRef.current as any); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector, stage, page]);

  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingCompany, setMeetingCompany] = useState<Company | null>(null);
  const [meetingMessage, setMeetingMessage] = useState('');
  const [meetingStart, setMeetingStart] = useState<string | null>(null);
  const [meetingEnd, setMeetingEnd] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openRequestMeetingModal(company: Company) {
    setMeetingCompany(company);
    setMeetingMessage(`Hi ${(company as any).company_name ?? (company as any).name ?? 'there'}, I'd like to discuss your company.`);
    setMeetingStart(null);
    setMeetingEnd(null);
    setMeetingModalOpen(true);
  }

  async function submitMeetingRequest() {
    if (!meetingCompany) return;
    setSubmitting(true);
    try {
      const meRes = await fetch('/api/investors/me', { credentials: 'include' });
      if (!meRes.ok) {
        if (meRes.status === 401) {
          toast({ title: 'Login Required', description: 'Please log in to request a meeting.' });
        } else if (meRes.status === 404) {
          toast({ title: 'Investor Account Required', description: 'You must be an investor to request meetings.' });
        } else {
          toast({ title: 'Unable to Verify Account', description: 'Could not verify your account to create a meeting request.' });
        }
        setSubmitting(false);
        return;
      }
      const me = await meRes.json();
      const fromUserId = me?.user_id;
      const fromRole = (me?.role ? String(me.role).toUpperCase() : 'INVESTOR');
      const displayName = (meetingCompany as any).company_name ?? (meetingCompany as any).name ?? 'this company';
      const body: any = {
        from_user_id: fromUserId,
        from_role: fromRole,
        to_user_id: meetingCompany.user_id ?? meetingCompany.id,
        message: meetingMessage,
      };
      if (meetingStart) body.proposed_start = meetingStart;
      if (meetingEnd) body.proposed_end = meetingEnd;

      const res = await fetch('/api/meetings/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'request failed');
      }
      setMeetingModalOpen(false);
      toast({ title: 'Request Sent', description: `Meeting request sent to ${displayName}` });
    } catch (err: any) {
      toast({ title: 'Request Failed', description: err?.message ?? String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <DashboardLayout role="investor">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading">Discover Companies</h1>
            <p className="text-muted-foreground">Browse and filter investment opportunities.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
            <Button onClick={() => toast({ title: 'Search Saved', description: 'You will be notified of new matches.' })}>Save Search</Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 bg-card/50 p-4 rounded-lg border border-white/5 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, technology, or keyword..." className="pl-9 bg-background/50 border-white/10" />
          </div>
          <Select onValueChange={(v) => setSector(v || null)}>
            <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
              <SelectValue placeholder="Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Renewables">Renewables</SelectItem>
              <SelectItem value="Grid Infra">Grid Infra</SelectItem>
              <SelectItem value="Storage">Storage</SelectItem>
              <SelectItem value="Clean Fuels">Clean Fuels</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setStage(v || null)}>
            <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Seed">Seed</SelectItem>
              <SelectItem value="Series A">Series A</SelectItem>
              <SelectItem value="Series B">Series B</SelectItem>
              <SelectItem value="Growth">Growth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Grid */}
        <div>
          {loading && <div className="text-sm text-muted-foreground">Loading companies…</div>}
          {error && <div className="text-sm text-destructive">Error: {error}</div>}
          {!loading && companies.length === 0 && <div className="text-sm text-muted-foreground">No companies found.</div>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {companies.map((company) => {
              const id = company.user_id ?? company.id;
              const displayName = (company as any).company_name ?? (company as any).name ?? '??';
              const tags = Array.isArray(company.tags)
                ? company.tags
                : (Array.isArray((company as any).preferred_investor_types)
                    ? (company as any).preferred_investor_types
                    : (company.tags ? String(company.tags).split(',') : []));
              return (
                <Card key={id} className="bg-card/50 border-white/5 hover:border-primary/50 transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-12 h-12 rounded bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-lg text-white">
                        {(displayName || '??').substring(0, 2).toUpperCase()}
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {company.matchScore ? `${company.matchScore.overall}% Match` : (company.match ? `${company.match} Match` : 'New')}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{displayName}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" /> {company.location}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {company.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] h-5 bg-white/5 hover:bg-white/10 text-muted-foreground font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white/5 p-2 rounded flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span>{company.stage}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>Asking {company.ask}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-3 border-t border-white/5 flex gap-2">
                    <Button 
                      className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                      onClick={() => openRequestMeetingModal(company)}
                      disabled={!(company.user_id ?? company.id)}
                    >
                      Request Meeting
                    </Button>
                    <Button variant="ghost" size="icon" className="border border-white/10 text-muted-foreground hover:text-white" onClick={() => window.location.href = `/company/${id}`}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Meeting request modal */}
          <Dialog open={meetingModalOpen} onOpenChange={setMeetingModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a meeting</DialogTitle>
                <DialogDescription>Send a message and optionally propose times to the company.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Message</Label>
                  <Textarea value={meetingMessage} onChange={(e) => setMeetingMessage((e.target as HTMLTextAreaElement).value)} className="w-full" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Proposed start</Label>
                    <Input type="datetime-local" value={meetingStart ?? ''} onChange={(e) => setMeetingStart((e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <Label>Proposed end</Label>
                    <Input type="datetime-local" value={meetingEnd ?? ''} onChange={(e) => setMeetingEnd((e.target as HTMLInputElement).value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setMeetingModalOpen(false)}>Cancel</Button>
                <Button onClick={submitMeetingRequest} disabled={submitting} className="ml-2">{submitting ? 'Sending…' : 'Send request'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">{total} results</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Prev</Button>
              <div className="text-sm">{page} / {pageCount}</div>
              <Button variant="ghost" onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount}>Next</Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
