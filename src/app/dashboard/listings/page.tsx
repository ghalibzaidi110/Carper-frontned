"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useMyListings, useUpdateListingStatus } from "@/hooks/use-api";
import { formatPKR, formatDate } from "@/lib/format";
import { Plus, Eye, Pencil, Loader2 } from "lucide-react";
import Link from "next/link";

export default function MyListingsPage() {
  const { data: listings, isLoading } = useMyListings();
  const updateStatus = useUpdateListingStatus();
  const listingList = Array.isArray(listings) ? listings : listings?.data || [];

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">My Listings</h1>
            <p className="text-sm text-muted-foreground mt-1">{listingList.length} listings</p>
          </div>
          <Link href="/dashboard/listings/create" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Create Listing
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : listingList.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">No listings yet. Create your first listing to sell a car.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Views</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Listed</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listingList.map((l: Record<string, unknown>) => (
                    <tr key={l.id as string} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-foreground max-w-[250px] truncate">{l.title as string}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-foreground">{formatPKR((l.askingPrice || l.price) as number)}</td>
                      <td className="px-4 py-4"><StatusBadge status={l.status as string} /></td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{(l.viewCount || l.views || 0) as number}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate((l.createdAt || l.listedDate) as string)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                          <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                          {(l.status as string) === "ACTIVE" && (
                            <button
                              onClick={() => handleStatusChange(l.id as string, "SOLD")}
                              className="text-xs px-2 py-1 rounded bg-success/10 text-success font-medium hover:bg-success/20"
                            >
                              Mark Sold
                            </button>
                          )}
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
