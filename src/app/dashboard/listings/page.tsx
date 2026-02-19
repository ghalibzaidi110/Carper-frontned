"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { DUMMY_LISTINGS } from "@/data/dummy";
import { formatPKR, formatDate } from "@/lib/format";
import { Plus, Eye, Pencil } from "lucide-react";

export default function MyListingsPage() {
  const { user } = useAuth();
  const listings = DUMMY_LISTINGS.filter((l) => l.userId === user?.id);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">My Listings</h1>
            <p className="text-sm text-muted-foreground mt-1">{listings.length} listings</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Create Listing
          </button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Car</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Views</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Listed</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listings.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-foreground">{l.car.manufacturer} {l.car.model} {l.car.year}</td>
                    <td className="px-4 py-4 text-sm text-foreground max-w-[200px] truncate">{l.title}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-foreground">{formatPKR(l.price)}</td>
                    <td className="px-4 py-4"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{l.views}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(l.listedDate)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                        <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
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
