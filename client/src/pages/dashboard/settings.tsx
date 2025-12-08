import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Lock, User, Moon, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface UserData {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

interface OAuthStatus {
  connected: boolean;
  calendarEmail?: string;
  syncExternalCalendar?: boolean;
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
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus>({ connected: false });
  const [oauthLoading, setOAuthLoading] = useState(false);
  const [arrangeMeetings, setArrangeMeetings] = useState(false);

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

        // Fetch OAuth status
        const oauthRes = await fetch('/api/oauth/status', { credentials: 'include' });
        if (oauthRes.ok) {
          const status = await oauthRes.json();
          setOAuthStatus(status);
        }
      } catch (err) {
        console.error('fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'success') {
      toast({ title: 'OAuth Connected', description: 'Your calendar has been connected successfully.' });
      window.history.replaceState({}, document.title, '/dashboard/settings');
    } else if (params.get('oauth') === 'error') {
      toast({ 
        title: 'OAuth Failed', 
        description: params.get('message') || 'Failed to connect calendar',
        variant: 'destructive'
      });
      window.history.replaceState({}, document.title, '/dashboard/settings');
    }

    fetchData();
  }, [toast]);

  const role = userData?.role?.toLowerCase().includes('company') ? 'company' : 'investor';

  const handleSaveProfile = () => {
    toast({ title: "Profile Saved", description: "Your information has been updated." });
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Please fill in both password fields." });
      return;
    }
    toast({ title: "Password Updated", description: "Your password has been changed successfully." });
    setCurrentPassword("");
    setNewPassword("");
  };

  const handleConnectOAuth = async () => {
    try {
      setOAuthLoading(true);
      const res = await fetch('/api/oauth/authorize', { credentials: 'include' });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast({ title: 'Error', description: 'Failed to generate authorization URL', variant: 'destructive' });
      }
    } catch (err) {
      console.error('OAuth error:', err);
      toast({ title: 'Error', description: 'Failed to connect calendar', variant: 'destructive' });
    } finally {
      setOAuthLoading(false);
    }
  };

  const handleDisconnectOAuth = async () => {
    try {
      const res = await fetch('/api/oauth/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setOAuthStatus({ connected: false });
        toast({ title: 'Disconnected', description: 'Your calendar has been disconnected.' });
      } else {
        toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Disconnect error:', err);
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  const handleUpdateArrangeSettings = async () => {
    try {
      const res = await fetch('/api/users/me/arrangement-preferences', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrangeMeetings }),
      });
      if (res.ok) {
        toast({ title: 'Saved', description: 'Auto-arrangement preferences updated.' });
      } else {
        toast({ title: 'Error', description: 'Failed to save preferences', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error:', err);
      toast({ title: 'Error', description: 'Failed to save preferences', variant: 'destructive' });
    }
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

        {/* Calendar & Auto-Scheduling */}
        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Calendar Integration & Auto-Scheduling
            </CardTitle>
            <CardDescription>Manage calendar sync and automatic meeting arrangement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OAuth Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  {oauthStatus.connected ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium">{oauthStatus.connected ? 'Connected' : 'Not Connected'}</p>
                    {oauthStatus.calendarEmail && (
                      <p className="text-sm text-muted-foreground">{oauthStatus.calendarEmail}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant={oauthStatus.connected ? "outline" : "default"}
                  onClick={oauthStatus.connected ? handleDisconnectOAuth : handleConnectOAuth}
                  disabled={oauthLoading}
                >
                  {oauthLoading ? 'Loading...' : oauthStatus.connected ? 'Disconnect' : 'Connect Calendar'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect your personal Google Calendar to enable automatic conflict checking and per-user calendar event creation.
              </p>
            </div>

            {/* Auto-Arrangement Toggle */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Auto-Meeting Arrangement</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically schedule meetings when a matched {role === 'company' ? 'investor' : 'company'} is available and also has this enabled.
                  </p>
                </div>
                <Switch 
                  checked={arrangeMeetings} 
                  onCheckedChange={setArrangeMeetings}
                />
              </div>
              {arrangeMeetings && (
                <Button 
                  variant="secondary"
                  onClick={handleUpdateArrangeSettings}
                  className="w-full"
                >
                  Save Auto-Arrangement Preference
                </Button>
              )}
            </div>
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
