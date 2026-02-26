"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { useAdminUsers, useAdminStats, useAdminUpdateUser } from "@/hooks/use-api";
import { Users, UserCheck, Truck, Ban, Search, Loader2 } from "lucide-react";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: statsData } = useAdminStats();
  const { data: usersData, isLoading } = useAdminUsers({
    search: search || undefined,
    accountType: typeFilter || undefined,
    accountStatus: statusFilter || undefined,
    limit: 50,
  });
  const updateUser = useAdminUpdateUser();

  const stats = statsData?.users || statsData || {};
  const rawUsers = usersData?.data || usersData || [];
  const users = Array.isArray(rawUsers) ? rawUsers : rawUsers?.data || rawUsers?.users || [];

  const handleToggleSuspend = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    updateUser.mutate({ id: userId, payload: { accountStatus: newStatus } });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats.total ?? 0} icon={Users} variant="primary" />
          <StatCard title="Individuals" value={stats.individuals ?? 0} icon={UserCheck} variant="info" />
          <StatCard title="Car Rentals" value={stats.rentalBusinesses ?? 0} icon={Truck} variant="success" />
          <StatCard title="Suspended" value={stats.suspended ?? 0} icon={Ban} variant="warning" />
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground"
          >
            <option value="">All Types</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="CAR_RENTAL">Car Rental</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verified</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">City</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u: Record<string, unknown>) => (
                    <tr key={u.id as string} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {((u.fullName || u.name) as string)?.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-foreground">{(u.fullName || u.name) as string}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{u.email as string}</td>
                      <td className="px-4 py-4"><StatusBadge status={(u.accountType || u.role) as string} /></td>
                      <td className="px-4 py-4"><StatusBadge status={(u.accountStatus || u.status || "ACTIVE") as string} /></td>
                      <td className="px-4 py-4">
                        <span className={`text-sm ${u.isVerified ? "text-success" : "text-destructive"}`}>
                          {u.isVerified ? "✅" : "❌"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{(u.city || "") as string}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">View</button>
                          <button
                            onClick={() => handleToggleSuspend(u.id as string, (u.accountStatus || u.status || "ACTIVE") as string)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-warning/10 text-warning font-medium hover:bg-warning/20 transition-colors"
                          >
                            {(u.accountStatus || u.status) === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
