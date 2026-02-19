"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { DUMMY_USERS } from "@/data/dummy";
import { Users, UserCheck, Truck, Ban, Search } from "lucide-react";

export default function AdminUsersPage() {
  const users = DUMMY_USERS.filter((u) => u.role !== "ADMIN");

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={DUMMY_USERS.length} icon={Users} variant="primary" />
          <StatCard title="Individuals" value={DUMMY_USERS.filter((u) => u.role === "INDIVIDUAL").length} icon={UserCheck} variant="info" />
          <StatCard title="Car Rentals" value={DUMMY_USERS.filter((u) => u.role === "CAR_RENTAL").length} icon={Truck} variant="success" />
          <StatCard title="Suspended" value={DUMMY_USERS.filter((u) => u.status === "SUSPENDED").length} icon={Ban} variant="warning" />
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select className="px-3 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground">
            <option>All Types</option>
            <option>Individual</option>
            <option>Car Rental</option>
          </select>
          <select className="px-3 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground">
            <option>All Status</option>
            <option>Active</option>
            <option>Suspended</option>
          </select>
        </div>

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
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {u.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-4"><StatusBadge status={u.role} /></td>
                    <td className="px-4 py-4"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-4">
                      <span className={`text-sm ${u.isVerified ? "text-success" : "text-destructive"}`}>
                        {u.isVerified ? "✅" : "❌"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{u.city}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">View</button>
                        <button className="text-xs px-3 py-1.5 rounded-lg bg-warning/10 text-warning font-medium hover:bg-warning/20 transition-colors">
                          {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
