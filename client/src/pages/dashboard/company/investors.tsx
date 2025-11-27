import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Search, Filter, MapPin, Briefcase, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INVESTORS = [
  {
    id: 1,
    name: "Green Horizon Ventures",
    type: "VC",
    stage: "Series A, Series B",
    location: "San Francisco, CA",
    focus: "Renewables, Storage",
    aum: "$500M",
    tags: ["Lead Investor", "Climate Tech"]
  },
  {
    id: 2,
    name: "Energy Capital Partners",
    type: "PE",
    stage: "Growth, Buyout",
    location: "New York, NY",
    focus: "Grid Infra, Utilities",
    aum: "$2B",
    tags: ["Infrastructure", "Global"]
  },
  {
    id: 3,
    name: "Future Grid Fund",
    type: "CVC",
    stage: "Seed, Series A",
    location: "London, UK",
    focus: "Smart Grid, AI",
    aum: "$150M",
    tags: ["Strategic", "Utility Backed"]
  },
  {
    id: 4,
    name: "BlackRock Energy",
    type: "Asset Manager",
    stage: "Late Stage",
    location: "New York, NY",
    focus: "Clean Fuels, CCUS",
    aum: "$50B",
    tags: ["Institutional", "ESG"]
  },
  {
    id: 5,
    name: "Sequoia Climate",
    type: "VC",
    stage: "Seed to IPO",
    location: "Menlo Park, CA",
    focus: "Deep Tech, Fusion",
    aum: "$1B",
    tags: ["Tier 1", "Deep Tech"]
  },
  {
    id: 6,
    name: "Breakthrough Energy",
    type: "Impact",
    stage: "All Stages",
    location: "Kirkland, WA",
    focus: "Hard Tech, Decarbonization",
    aum: "$2B+",
    tags: ["Impact", "Long-term"]
  }
];

export default function CompanyInvestors() {
  const { toast } = useToast();
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
          {INVESTORS.map((investor) => (
            <Card key={investor.id} className="bg-card/50 border-white/5 hover:border-secondary/50 transition-all duration-300 group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-lg text-white">
                    {investor.name.substring(0, 2).toUpperCase()}
                  </div>
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    {investor.type}
                  </Badge>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold group-hover:text-secondary transition-colors">{investor.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" /> {investor.location}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                 <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">AUM</div>
                    <div className="font-medium">{investor.aum}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Focus</div>
                    <div className="font-medium truncate">{investor.focus}</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {investor.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-5 bg-white/5 hover:bg-white/10 text-muted-foreground font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="bg-white/5 p-2 rounded flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span>{investor.stage}</span>
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
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
