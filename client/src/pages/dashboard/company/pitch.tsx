import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileText, Image as ImageIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface CompanyProfile {
  user_id?: string;
  company_name?: string;
  tagline?: string;
  description?: string;
  sector?: string;
  stage?: string;
  capital_sought?: string;
  pitch_deck_url?: string;
  logo_url?: string;
}

export default function CompanyPitch() {
  const { toast } = useToast();
  const [companyData, setCompanyData] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [stage, setStage] = useState("");
  const [capitalSought, setCapitalSought] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/companies/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setCompanyData(data);
          setCompanyName(data.company_name || "");
          setTagline(data.tagline || "");
          setDescription(data.description || "");
          setSector(data.sector || "");
          setStage(data.stage || "");
          setCapitalSought(data.capital_sought || "");
        }
      } catch (err) {
        console.error('fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/companies/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          tagline,
          description,
          sector,
          stage,
          capital_sought: capitalSought,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      toast({ title: "Pitch Updated", description: "Your company profile has been saved." });
    } catch (err) {
      toast({ title: "Save Failed", description: "Could not save changes." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="company">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading pitch profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="company">
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading">Pitch Profile</h1>
            <p className="text-muted-foreground">Manage how investors see your company.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Preview</Button>
            <Button 
              className="bg-secondary hover:bg-secondary/90"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Basic Info */}
          <Card className="bg-card/50 border-white/5">
            <CardHeader>
              <CardTitle>Company Essentials</CardTitle>
              <CardDescription>The core information about your business.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    className="bg-background/50 border-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input 
                    value={tagline} 
                    onChange={(e) => setTagline(e.target.value)} 
                    placeholder="One-line pitch"
                    className="bg-background/50 border-white/10" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Elevator Pitch (Short Description)</Label>
                <Textarea 
                  className="bg-background/50 border-white/10 min-h-[100px]" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your company in a few sentences..."
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sector</Label>
                  <Input 
                    value={sector} 
                    onChange={(e) => setSector(e.target.value)} 
                    className="bg-background/50 border-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <select 
                    value={stage} 
                    onChange={(e) => setStage(e.target.value)} 
                    className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-sm"
                  >
                    <option value="">Select stage</option>
                    <option value="Seed">Seed</option>
                    <option value="Series A">Series A</option>
                    <option value="Series B">Series B</option>
                    <option value="Growth">Growth</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Funding Ask</Label>
                  <Input 
                    value={capitalSought} 
                    onChange={(e) => setCapitalSought(e.target.value)} 
                    placeholder="e.g., $5M"
                    className="bg-background/50 border-white/10" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files */}
          <Card className="bg-card/50 border-white/5">
            <CardHeader>
              <CardTitle>Documents & Media</CardTitle>
              <CardDescription>Upload your deck and other materials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-secondary/50 transition-colors cursor-pointer bg-white/[0.02]">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-1">Upload Pitch Deck</h3>
                <p className="text-xs text-muted-foreground">PDF up to 20MB</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Uploaded Files</h4>
                {companyData?.pitch_deck_url ? (
                  <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-red-400" />
                      <div>
                        <div className="text-sm font-medium">Pitch Deck</div>
                        <div className="text-xs text-muted-foreground">Uploaded</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Remove</Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-3">No files uploaded yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
