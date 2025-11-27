import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, Globe, Briefcase, Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-heading">My Profile</h1>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save Changes</Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="bg-card/50 border-white/5 overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20 relative">
                <Button size="sm" variant="ghost" className="absolute right-2 top-2 bg-black/20 hover:bg-black/40 text-white border-none">
                  <Camera className="w-4 h-4 mr-2" /> Cover
                </Button>
              </div>
              <div className="px-6 relative">
                <div className="absolute -top-12 left-6">
                  <Avatar className="w-24 h-24 border-4 border-card bg-card">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1 cursor-pointer hover:bg-primary/80 transition-colors">
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
              <CardContent className="pt-16 pb-6">
                <h2 className="text-xl font-bold">John Doe</h2>
                <p className="text-muted-foreground text-sm mb-4">Partner at GreenTech Ventures</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">Investor</Badge>
                  <Badge variant="outline" className="border-white/10">Verified</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>john@greentech.vc</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>San Francisco, CA</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <a href="#" className="text-primary hover:underline">greentech.vc</a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-card/50 border-white/5">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input defaultValue="John" className="bg-background/50 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input defaultValue="Doe" className="bg-background/50 border-white/10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input defaultValue="Partner at GreenTech Ventures" className="bg-background/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Input className="h-24 bg-background/50 border-white/10" defaultValue="Experienced investor focused on early-stage climate tech and renewable energy infrastructure." />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/5">
              <CardHeader>
                <CardTitle>Professional Details</CardTitle>
                <CardDescription>Tell us about your work.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company / Firm</Label>
                  <div className="flex gap-2">
                    <Input defaultValue="GreenTech Ventures" className="bg-background/50 border-white/10" />
                    <Button variant="outline" className="border-white/10">
                      <Briefcase className="w-4 h-4 mr-2" /> Verify
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input defaultValue="Partner" className="bg-background/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Investment Focus</Label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-md border border-white/10 bg-background/50 min-h-[3rem]">
                    <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 cursor-pointer">Renewables &times;</Badge>
                    <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 cursor-pointer">Storage &times;</Badge>
                    <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 cursor-pointer">Grid Infra &times;</Badge>
                    <span className="text-xs text-muted-foreground flex items-center px-2">+ Add focus area</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
