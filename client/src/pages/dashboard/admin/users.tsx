import { DashboardLayout } from "@/components/layout-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MoreHorizontal, Shield, Ban, CheckCircle } from "lucide-react";

const USERS = [
  { id: 1, name: "GreenTech Ventures", email: "contact@greentech.vc", role: "Investor", status: "Active", joined: "Oct 12, 2024" },
  { id: 2, name: "Solar Solutions Inc", email: "admin@solarsolutions.com", role: "Company", status: "Active", joined: "Nov 01, 2024" },
  { id: 3, name: "James Wilson", email: "j.wilson@apexcapital.com", role: "Investor", status: "Active", joined: "Nov 05, 2024" },
  { id: 4, name: "HydroGen Corp", email: "info@hydrogencorp.energy", role: "Company", status: "Pending", joined: "Today" },
  { id: 5, name: "Wind Power Ltd", email: "hello@windpower.co.uk", role: "Company", status: "Suspended", joined: "Sep 15, 2024" },
];

export default function AdminUsers() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold font-heading">User Management</h1>
          <Button>Export CSV</Button>
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
                {USERS.map((user) => (
                  <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                       <Badge variant="outline" className={
                        user.role === "Investor" 
                          ? "bg-primary/10 text-primary border-primary/20" 
                          : "bg-secondary/10 text-secondary border-secondary/20"
                      }>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.joined}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`
                        ${user.status === 'Active' && 'bg-green-500/10 text-green-500'}
                        ${user.status === 'Pending' && 'bg-yellow-500/10 text-yellow-500'}
                        ${user.status === 'Suspended' && 'bg-red-500/10 text-red-500'}
                      `}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
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
