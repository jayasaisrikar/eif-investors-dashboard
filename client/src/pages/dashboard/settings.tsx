import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Lock, User, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  return (
    <DashboardLayout role="investor"> {/* Role could be dynamic here, defaulting to investor layout for demo */}
      <div className="space-y-8 max-w-3xl">
        <h1 className="text-3xl font-bold font-heading">Account Settings</h1>

        {/* Profile Info */}
        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input defaultValue="Alex" className="bg-background/50 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input defaultValue="Thompson" className="bg-background/50 border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input defaultValue="alex@greentech.vc" className="bg-background/50 border-white/10" />
            </div>
            <Button className="mt-2" onClick={() => toast({ title: "Profile Saved", description: "Your information has been updated." })}>Save Profile</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notifications
            </CardTitle>
            <CardDescription>Manage how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive daily summaries of activity.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Meeting Reminders</Label>
                <p className="text-sm text-muted-foreground">Get notified 15 mins before meetings.</p>
              </div>
              <Switch defaultChecked />
            </div>
             <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">New Match Alerts</Label>
                <p className="text-sm text-muted-foreground">When a new company matches your criteria.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" placeholder="••••••••" className="bg-background/50 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" placeholder="••••••••" className="bg-background/50 border-white/10" />
              </div>
              <Button variant="secondary" className="mt-2" onClick={() => toast({ title: "Password Updated", description: "Your password has been changed successfully." })}>Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
