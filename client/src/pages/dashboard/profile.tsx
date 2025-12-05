import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Upload, Camera, Globe, MapPin, DollarSign, Mail, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface UserData {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

interface InvestorProfile {
  user_id?: string;
  full_name?: string;
  firm?: string;
  role?: string;
  bio?: string;
  aum?: string;
  check_size_unit?: string;
  sectors?: string[];
}

interface CompanyProfile {
  user_id?: string;
  company_name?: string;
  tagline?: string;
  description?: string;
  sector?: string;
  stage?: string;
  hq_location?: string;
  capital_sought?: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'investor' | 'company' | null>(null);

  // Form state for investor
  const [fullName, setFullName] = useState("");
  const [firm, setFirm] = useState("");
  const [investorRole, setInvestorRole] = useState("");
  const [bio, setBio] = useState("");
  const [aum, setAum] = useState("");
  const [checkSizeUnit, setCheckSizeUnit] = useState("M");
  const [sectors, setSectors] = useState<string[]>([]);
  const [newSector, setNewSector] = useState("");

  // Form state for company
  const [companyName, setCompanyName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [companySector, setCompanySector] = useState("");
  const [stage, setStage] = useState("");
  const [hqLocation, setHqLocation] = useState("");
  const [capitalSought, setCapitalSought] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch authenticated user data
        const userRes = await fetch('/api/users/me', { credentials: 'include' });
        if (!userRes.ok) {
          throw new Error('Failed to fetch user data');
        }

        const data = await userRes.json();
        setUserData(data);
        const isCompany = data.role?.toLowerCase().includes('company') ?? false;
        setUserRole(isCompany ? 'company' : 'investor');

        if (isCompany) {
          // Fetch company profile
          try {
            const compRes = await fetch('/api/companies/me', { credentials: 'include' });
            if (compRes.ok) {
              const comp = await compRes.json();
              setCompanyProfile(comp);
              setCompanyName(comp.company_name || "");
              setTagline(comp.tagline || "");
              setDescription(comp.description || "");
              setCompanySector(comp.sector || "");
              setStage(comp.stage || "");
              setHqLocation(comp.hq_location || "");
              setCapitalSought(comp.capital_sought || "");
            } else {
              console.warn('Failed to fetch company profile');
              toast({ 
                title: 'Warning', 
                description: 'Could not load all profile data. Please refresh the page.' 
              });
            }
          } catch (err) {
            console.error('Company profile fetch error:', err);
          }
        } else {
          // Fetch investor profile
          try {
            const invRes = await fetch('/api/investors/me', { credentials: 'include' });
            if (invRes.ok) {
              const inv = await invRes.json();
              setInvestorProfile(inv);
              setFullName(inv.full_name || "");
              setFirm(inv.firm || "");
              setInvestorRole(inv.role || "");
              setBio(inv.bio || "");
              setAum(inv.aum || "");
              setCheckSizeUnit(inv.check_size_unit || "M");
              setSectors(inv.sectors || []);
            } else {
              console.warn('Failed to fetch investor profile');
              toast({ 
                title: 'Warning', 
                description: 'Could not load all profile data. Please refresh the page.' 
              });
            }
          } catch (err) {
            console.error('Investor profile fetch error:', err);
          }
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        toast({ 
          title: 'Error', 
          description: 'Failed to load profile. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (userRole === 'company') {
        // Save company profile
        const res = await fetch('/api/companies/me', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: companyName,
            tagline,
            description,
            sector: companySector,
            stage,
            hq_location: hqLocation,
            capital_sought: capitalSought,
          }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData?.message || 'Failed to save company profile');
        }

        // Refetch to verify persistence
        const updatedProfile = await res.json();
        setCompanyProfile(updatedProfile);
        
        toast({ 
          title: 'Success', 
          description: 'Your company profile has been saved successfully.' 
        });
      } else {
        // Save investor profile
        const res = await fetch('/api/investors/me', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            firm,
            role: investorRole,
            bio,
            aum,
            check_size_unit: checkSizeUnit,
            sectors,
          }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData?.message || 'Failed to save investor profile');
        }

        // Refetch to verify persistence
        const updatedProfile = await res.json();
        setInvestorProfile(updatedProfile);
        
        toast({ 
          title: 'Success', 
          description: 'Your investor profile has been saved successfully.' 
        });
      }
    } catch (err: any) {
      console.error('Profile save error:', err);
      toast({ 
        title: 'Save Failed', 
        description: err?.message || 'Could not save profile changes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSector = () => {
    if (newSector.trim() && !sectors.includes(newSector)) {
      setSectors([...sectors, newSector]);
      setNewSector("");
    }
  };

  const handleRemoveSector = (sector: string) => {
    setSectors(sectors.filter(s => s !== sector));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  const isCompany = userRole === 'company';
  const displayName = isCompany ? (companyName || userData?.name) : (fullName || userData?.name);
  const initials = displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "U";
  const subtitle = isCompany ? (stage ? `${stage} Stage` : "Company") : (investorRole ? `${investorRole} at ${firm}` : "Investor");

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-heading">{isCompany ? "Company Profile" : "My Profile"}</h1>
          <Button onClick={handleSave} disabled={saving} className={isCompany ? "bg-secondary hover:bg-secondary/90" : "bg-primary hover:bg-primary/90"}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div>
            <Card className="bg-card/50 border-white/5 overflow-hidden">
              <div className={`h-32 bg-gradient-to-r ${isCompany ? "from-secondary/20 to-primary/20" : "from-primary/20 to-secondary/20"} relative`}>
                <Button size="sm" variant="ghost" className="absolute right-2 top-2 bg-black/20 hover:bg-black/40 text-white border-none">
                  <Camera className="w-4 h-4 mr-2" /> Cover
                </Button>
              </div>
              <div className="px-6 relative">
                <div className="absolute -top-12 left-6">
                  <Avatar className="w-24 h-24 border-4 border-card bg-card">
                    <AvatarImage />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 rounded-full p-1 cursor-pointer transition-colors ${isCompany ? "bg-secondary hover:bg-secondary/80" : "bg-primary hover:bg-primary/80"}`}>
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
              <CardContent className="pt-16 pb-6">
                <h2 className="text-xl font-bold">{displayName || "Name"}</h2>
                <p className="text-muted-foreground text-sm mb-4">{subtitle}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="secondary" className={isCompany ? "bg-secondary/10 text-secondary hover:bg-secondary/20" : "bg-primary/10 text-primary hover:bg-primary/20"}>
                    {isCompany ? "Company" : "Investor"}
                  </Badge>
                  <Badge variant="outline" className="border-white/10">Verified</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{userData?.email || "email@example.com"}</span>
                  </div>
                  {!isCompany && firm && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Briefcase className="w-4 h-4" />
                      <span>{firm}</span>
                    </div>
                  )}
                  {isCompany && hqLocation && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{hqLocation}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Form */}
          <div className="md:col-span-2 space-y-6">
            {isCompany ? (
              <>
                <Card className="bg-card/50 border-white/5">
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-background/50 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tagline</Label>
                      <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-line description" className="bg-background/50 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full h-24 px-3 py-2 bg-background/50 border border-white/10 rounded-md text-sm" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-white/5">
                  <CardHeader>
                    <CardTitle>Business Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Sector</Label>
                        <Input value={companySector} onChange={(e) => setCompanySector(e.target.value)} className="bg-background/50 border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label>Stage</Label>
                        <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-sm">
                          <option value="">Select stage</option>
                          <option value="Seed">Seed</option>
                          <option value="Series A">Series A</option>
                          <option value="Series B">Series B</option>
                          <option value="Growth">Growth</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>HQ Location</Label>
                        <Input value={hqLocation} onChange={(e) => setHqLocation(e.target.value)} className="bg-background/50 border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label>Capital Sought</Label>
                        <Input value={capitalSought} onChange={(e) => setCapitalSought(e.target.value)} placeholder="e.g., $5M" className="bg-background/50 border-white/10" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="bg-card/50 border-white/5">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-background/50 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={userData?.email || ""} disabled className="bg-background/50 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full h-24 px-3 py-2 bg-background/50 border border-white/10 rounded-md text-sm" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-white/5">
                  <CardHeader>
                    <CardTitle>Professional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Firm</Label>
                        <Input value={firm} onChange={(e) => setFirm(e.target.value)} className="bg-background/50 border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input value={investorRole} onChange={(e) => setInvestorRole(e.target.value)} className="bg-background/50 border-white/10" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>AUM</Label>
                        <Input value={aum} onChange={(e) => setAum(e.target.value)} placeholder="e.g., 500M" className="bg-background/50 border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label>Check Size Unit</Label>
                        <select value={checkSizeUnit} onChange={(e) => setCheckSizeUnit(e.target.value)} className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-sm">
                          <option value="M">Millions</option>
                          <option value="k">Thousands</option>
                          <option value="raw">Raw</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Investment Focus</Label>
                      <div className="flex flex-wrap gap-2 p-3 rounded-md border border-white/10 bg-background/50 min-h-[3rem] mb-2">
                        {sectors.map((sector) => (
                          <Badge key={sector} variant="secondary" className="bg-white/10 hover:bg-white/20 cursor-pointer" onClick={() => handleRemoveSector(sector)}>
                            {sector} ×
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input value={newSector} onChange={(e) => setNewSector(e.target.value)} placeholder="Add sector..." className="bg-background/50 border-white/10" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSector())} />
                        <Button size="sm" onClick={handleAddSector} variant="outline" className="border-white/10">Add</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
