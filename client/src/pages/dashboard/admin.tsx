import { DashboardLayout } from "@/components/layout-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, AlertCircle, CheckCircle, XCircle } from "lucide-react";

export default function AdminDashboard() {
  const recentUsers = [
    { name: "GreenTech Ventures", email: "contact@greentech.vc", role: "Investor", status: "Pending" },
    { name: "Solar Solutions Inc", email: "admin@solarsolutions.com", role: "Company", status: "Verified" },
    { name: "James Wilson", email: "j.wilson@apexcapital.com", role: "Investor", status: "Verified" },
    { name: "HydroGen Corp", email: "info@hydrogencorp.energy", role: "Company", status: "Pending" },
    { name: "Wind Power Ltd", email: "hello@windpower.co.uk", role: "Company", status: "Rejected" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading">System Administration</h1>
            <p className="text-muted-foreground">Manage users, approvals, and platform settings.</p>
          </div>
          <Button variant="destructive">Emergency Maintenance</Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground mt-1">845 Investors, 389 Companies</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Meetings</CardTitle>
              <Calendar className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground mt-1">Happening right now</p>
            </CardContent>
          </Card>
        </div>

        {/* User Management Table */}
        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
            <CardDescription>Review and approve new user accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((user, i) => (
                  <TableRow key={i} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        user.role === "Investor" 
                          ? "bg-primary/10 text-primary border-primary/20" 
                          : "bg-secondary/10 text-secondary border-secondary/20"
                      }>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.status === "Verified" && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {user.status === "Pending" && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                        {user.status === "Rejected" && <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-sm">{user.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.status === "Pending" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
