"use client";

import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats, useNotifications, useUnreadCount } from "@/hooks/use-api";
import { ScanSearch, Bell, Loader2 } from "lucide-react";
import { getTimeAgo } from "@/lib/format";

// FYP scope is individual-user-only — the rentals dashboard widget is
// hidden along with the sidebar nav link. The Rental model + API + pages
// still exist; just not surfaced. See docs/REMAINING.md item 2.5.
// To restore: re-import `useRentalStats`, `Truck`, `DollarSign`, `BarChart3`
// and uncomment the rental stats block below.

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: notifData } = useNotifications({ limit: 5 });
  const { data: unreadData } = useUnreadCount();

  const rawNotifs = notifData?.data || notifData || [];
  const notifications = Array.isArray(rawNotifs) ? rawNotifs : rawNotifs?.data || [];
  const unread = unreadData?.unreadCount ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your vehicles.</p>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard title="Damage Scans" value={stats?.totalDamageDetections ?? 0} icon={ScanSearch} variant="warning" />
          <StatCard title="Notifications" value={unread} icon={Bell} variant="info" />
        </div>
      )}

      {/* Rentals stats panel hidden for FYP scope (individual-user only).
          Rental data flow remains intact in the backend. */}

      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Recent Notifications</h3>
        <div className="space-y-3">
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No notifications yet</p>
          )}
          {notifications.slice(0, 4).map((n: Record<string, unknown>) => (
            <div key={n.id as string} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${(n.isRead || n.read) ? "bg-muted-foreground/30" : "bg-primary"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title as string}</p>
                <p className="text-xs text-muted-foreground truncate">{n.message as string}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={n.type as string} />
                  <span className="text-xs text-muted-foreground">{getTimeAgo(n.createdAt as string)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
