import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MoreHorizontal, Shield, Ban, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  email_verified?: boolean;
  created_at?: string;
}

const USERS: AdminUser[] = [];

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>(USERS);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users', { credentials: 'include' });
        if (!res.ok) throw new Error('failed to fetch users');
        const data = await res.json();
        setUsers(data || []);
      } catch (err: any) {
        toast({ title: 'Failed', description: 'Could not load users' });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold font-heading">User Management</h1>
          <Button onClick={() => toast({ title: "Export Started", description: "Downloading users.csv..." })}>Export CSV</Button>
        </div>

        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-9 bg-background/50 border-white/10" />
              </div>
              <Button variant="outline">Filter</Button>
            </div>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No users found</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium">{user.name ?? user.email}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                         <Badge variant="outline" className={
                          user.role?.toLowerCase() === "investor" 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : "bg-secondary/10 text-secondary border-secondary/20"
                        }>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={user.email_verified ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}>
                          {user.email_verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center gap-2">
              <Input placeholder="Invite email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <Button onClick={async () => {
                if (!inviteEmail) return toast({ title: 'Email required' });
                try {
                  const r = await fetch('/api/admin/invite', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) });
                  if (!r.ok) throw new Error('invite failed');
                  toast({ title: 'Invite Sent', description: `Invitation sent to ${inviteEmail}` });
                  setInviteEmail('');
                } catch (err) {
                  toast({ title: 'Invite Failed', description: 'Could not send invite' });
                }
              }}>Invite</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
