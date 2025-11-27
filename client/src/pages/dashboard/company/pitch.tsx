import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileText, Image as ImageIcon, Save } from "lucide-react";

export default function CompanyPitch() {
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
            <Button className="bg-secondary hover:bg-secondary/90">
              <Save className="w-4 h-4 mr-2" /> Save Changes
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
                  <Input defaultValue="SolarFlow Tech" className="bg-background/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input defaultValue="Next-gen solar optimization" className="bg-background/50 border-white/10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Elevator Pitch (Short Description)</Label>
                <Textarea className="bg-background/50 border-white/10 min-h-[100px]" defaultValue="SolarFlow Tech provides AI-driven tracking software that increases solar farm output by up to 15% without new hardware..." />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sector</Label>
                  <Input defaultValue="Renewables" className="bg-background/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Input defaultValue="Series A" className="bg-background/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Funding Ask</Label>
                  <Input defaultValue="$5M" className="bg-background/50 border-white/10" />
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
                <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-400" />
                    <div>
                      <div className="text-sm font-medium">SolarFlow_Pitch_Deck_v3.pdf</div>
                      <div className="text-xs text-muted-foreground">3.4 MB • Uploaded 2 days ago</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Remove</Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-sm font-medium">Logo_Pack.zip</div>
                      <div className="text-xs text-muted-foreground">1.2 MB • Uploaded 1 week ago</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Remove</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
