import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AdminSettings() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-3xl font-bold font-heading">System Settings</h1>
        
        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle>General Configuration</CardTitle>
            <CardDescription>Platform-wide settings and controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Registration Open</Label>
                <p className="text-sm text-muted-foreground">Allow new users to sign up.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator className="bg-white/10" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Take the site offline for updates.</p>
              </div>
              <Switch />
            </div>
             <Separator className="bg-white/10" />
             <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Require Admin Approval</Label>
                <p className="text-sm text-muted-foreground">New accounts must be manually approved.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>SMTP settings for system emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input defaultValue="smtp.sendgrid.net" className="bg-background/50 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input defaultValue="587" className="bg-background/50 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Sender Name</Label>
                <Input defaultValue="EIF Portal Team" className="bg-background/50 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Sender Email</Label>
                <Input defaultValue="noreply@energyinvestorsforum.com" className="bg-background/50 border-white/10" />
              </div>
            </div>
            <Button className="mt-2">Test Connection</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
