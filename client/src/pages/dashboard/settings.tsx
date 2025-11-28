import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Lock, User, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface UserData {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
          const nameParts = (data.name || "").split(' ');
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(' ') || "");
          setEmail(data.email || "");
        }
      } catch (err) {
        console.error('fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const role = userData?.role?.toLowerCase().includes('company') ? 'company' : 'investor';

  const handleSaveProfile = () => {
    // In a real app, this would call an API to update user info
    toast({ title: "Profile Saved", description: "Your information has been updated." });
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Please fill in both password fields." });
      return;
    }
    // In a real app, this would call an API to update password
    toast({ title: "Password Updated", description: "Your password has been changed successfully." });
    setCurrentPassword("");
    setNewPassword("");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
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
                <Input 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  className="bg-background/50 border-white/10" 
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  className="bg-background/50 border-white/10" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                value={email} 
                disabled 
                className="bg-background/50 border-white/10" 
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
            </div>
            <Button className="mt-2" onClick={handleSaveProfile}>Save Profile</Button>
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
                <p className="text-sm text-muted-foreground">When a new {role === 'company' ? 'investor' : 'company'} matches your criteria.</p>
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
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-background/50 border-white/10" 
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background/50 border-white/10" 
                />
              </div>
              <Button variant="secondary" className="mt-2" onClick={handleUpdatePassword}>Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
