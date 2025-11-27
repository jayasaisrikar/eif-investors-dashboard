import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Search, Filter, MapPin, DollarSign, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COMPANIES = [
  {
    id: 1,
    name: "SolarFlow Tech",
    sector: "Renewables",
    stage: "Series A",
    location: "Austin, TX",
    ask: "$5M",
    description: "Next-generation solar tracking software optimizing efficiency by 15%.",
    tags: ["Solar", "SaaS", "AI"],
    match: "98%"
  },
  {
    id: 2,
    name: "GridGuard",
    sector: "Grid Infra",
    stage: "Seed",
    location: "Boston, MA",
    ask: "$2M",
    description: "Cybersecurity hardware for distributed energy resources.",
    tags: ["Hardware", "Security", "Grid"],
    match: "95%"
  },
  {
    id: 3,
    name: "HydrogenOne",
    sector: "Clean Fuels",
    stage: "Series B",
    location: "London, UK",
    ask: "$15M",
    description: "Modular green hydrogen electrolyzers for industrial applications.",
    tags: ["Hydrogen", "Hardware", "Industrial"],
    match: "92%"
  },
  {
    id: 4,
    name: "CarbonCapture Co",
    sector: "CCUS",
    stage: "Series A",
    location: "Vancouver, CA",
    ask: "$8M",
    description: "Direct air capture technology using novel sorbents.",
    tags: ["Climate Tech", "Deep Tech"],
    match: "89%"
  },
  {
    id: 5,
    name: "VoltStorage",
    sector: "Storage",
    stage: "Series C",
    location: "Berlin, DE",
    ask: "$25M",
    description: "Long-duration redox flow batteries for grid stabilization.",
    tags: ["Batteries", "Storage"],
    match: "85%"
  },
  {
    id: 6,
    name: "WindScale",
    sector: "Renewables",
    stage: "Series A",
    location: "Denver, CO",
    ask: "$6M",
    description: "Vertical axis wind turbines for urban environments.",
    tags: ["Wind", "Hardware"],
    match: "80%"
  }
];

export default function InvestorDiscover() {
  const { toast } = useToast();
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
            <Button onClick={() => toast({ title: "Search Saved", description: "You will be notified of new matches." })}>Save Search</Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 bg-card/50 p-4 rounded-lg border border-white/5 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, technology, or keyword..." className="pl-9 bg-background/50 border-white/10" />
          </div>
          <Select>
            <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
              <SelectValue placeholder="Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="renewables">Renewables</SelectItem>
              <SelectItem value="grid">Grid Infra</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
              <SelectItem value="fuels">Clean Fuels</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seed">Seed</SelectItem>
              <SelectItem value="series-a">Series A</SelectItem>
              <SelectItem value="series-b">Series B</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COMPANIES.map((company) => (
            <Card key={company.id} className="bg-card/50 border-white/5 hover:border-primary/50 transition-all duration-300 group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-lg text-white">
                    {company.name.substring(0, 2).toUpperCase()}
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {company.match ? `${company.match} Match` : "New"}
                  </Badge>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{company.name}</h3>
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
                  {company.tags.map(tag => (
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
                  onClick={() => toast({ title: "Request Sent", description: `Meeting request sent to ${company.name}` })}
                >
                  Request Meeting
                </Button>
                <Button variant="ghost" size="icon" className="border border-white/10 text-muted-foreground hover:text-white">
                  <Search className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
