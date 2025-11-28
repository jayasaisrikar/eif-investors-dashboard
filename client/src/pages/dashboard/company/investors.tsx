import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Search, Filter, MapPin, Briefcase, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

// Investors will be loaded from the server API (/api/investors) which uses Supabase as
// the primary storage backend. The server already exposes `/api/investors`.
type Investor = any;

// Fallback to an empty list while data loads.
const EMPTY: Investor[] = [];

export default function CompanyInvestors() {
  const { toast } = useToast();
  const [investors, setInvestors] = useState<Investor[]>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/investors', { credentials: 'include' });
        if (!res.ok) throw new Error('failed to fetch investors');
        const data = await res.json();
        if (mounted && Array.isArray(data)) setInvestors(data);
      } catch (err) {
        console.error('fetch investors error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function formatCheckSize(min: any, max: any, unit?: string) {
    // If values are empty/null return a dash
    if ((min === null || min === undefined || min === '') && (max === null || max === undefined || max === '')) return '—';
    const nf = (v: any) => {
      if (v === null || v === undefined || v === '') return null;
      // Assume values are millions if small decimals present (heuristic). If value >= 1000 assume it's raw number.
      const n = Number(v);
      if (Number.isNaN(n)) return String(v);
      // Unit handling: 'M' => millions, 'k' => thousands, 'raw' => raw numeric
      if (unit === 'raw') return `$${n.toLocaleString()}`;
      if (unit === 'k') {
        return n % 1 === 0 ? `$${n}k` : `$${n}k`;
      }
      // default to millions
      if (Math.abs(n) >= 1000) return `${n.toLocaleString()}`;
      return `$${n}M`;
    };
    const a = nf(min);
    const b = nf(max);
    if (a && b) return a === b ? a : `${a} – ${b}`;
    return a ?? b ?? '—';
  }
  return (
    <DashboardLayout role="company">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading">Find Investors</h1>
            <p className="text-muted-foreground">Search active investors matching your criteria.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 bg-card/50 p-4 rounded-lg border border-white/5 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by firm name, focus area..." className="pl-9 bg-background/50 border-white/10" />
          </div>
          <Select>
            <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
              <SelectValue placeholder="Investor Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vc">Venture Capital</SelectItem>
              <SelectItem value="pe">Private Equity</SelectItem>
              <SelectItem value="cvc">Corporate VC</SelectItem>
              <SelectItem value="angel">Angel Group</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
              <SelectValue placeholder="Stage Focus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seed">Seed</SelectItem>
              <SelectItem value="series-a">Series A</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center text-muted-foreground">Loading investors...</div>
          ) : investors.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">No investors found.</div>
          ) : (
            investors.map((investor, idx) => (
              <Card key={investor.user_id ?? investor.id ?? idx} className="bg-card/50 border-white/5 hover:border-secondary/50 transition-all duration-300 group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-lg text-white">
                    {(investor.firm || investor.name || '??').substring(0, 2).toUpperCase()}
                  </div>
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    {investor.role ?? investor.type ?? 'Investor'}
                  </Badge>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold group-hover:text-secondary transition-colors">{investor.firm ?? investor.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" /> {Array.isArray(investor.geographies) ? (investor.geographies[0] ?? '—') : (investor.hq_location ?? '—')}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                 <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">AUM</div>
                    <div className="font-medium">{investor.aum ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Focus</div>
                    <div className="font-medium truncate">{Array.isArray(investor.sectors) ? investor.sectors.join(', ') : (investor.focus ?? '—')}</div>
                  </div>
                </div>
                {/* Check size display (non-disruptive): show numeric ticket range if present */}
                {(investor.check_size_min || investor.check_size_max) && (
                  <div className="text-xs text-muted-foreground mb-3">
                    <div className="text-[11px]">Check Size</div>
                    <div className="font-medium text-sm">
                      {formatCheckSize(investor.check_size_min, investor.check_size_max, investor.check_size_unit)}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {(Array.isArray(investor.tags) ? investor.tags : (Array.isArray(investor.sectors) ? investor.sectors : [])).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-5 bg-white/5 hover:bg-white/10 text-muted-foreground font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="bg-white/5 p-2 rounded flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span>{Array.isArray(investor.stages) ? investor.stages.join(', ') : (investor.stage ?? '—')}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-white/5 flex gap-2">
                <Button 
                  className="flex-1 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20"
                  onClick={() => toast({ title: "Pitch Sent", description: `Pitch deck sent to ${investor.name}` })}
                >
                  Send Pitch
                </Button>
                <Button variant="ghost" size="icon" className="border border-white/10 text-muted-foreground hover:text-white">
                  <Globe className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
