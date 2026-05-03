"use client";

import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats, useNotifications, useRentalStats, useUnreadCount } from "@/hooks/use-api";
import { ScanSearch, Bell, Truck, DollarSign, BarChart3, Loader2 } from "lucide-react";
import { getTimeAgo } from "@/lib/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: notifData } = useNotifications({ limit: 5 });
  const { data: unreadData } = useUnreadCount();
  const { data: rentalStats } = useRentalStats();
  const isRental = user?.role === "CAR_RENTAL";

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

      {isRental && rentalStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Active Rentals" value={rentalStats.activeRentals ?? 0} icon={Truck} variant="primary" />
          <StatCard title="Completed Rentals" value={rentalStats.completedRentals ?? 0} icon={BarChart3} variant="success" />
          <StatCard title="Total Revenue" value={`₨ ${((rentalStats.totalRevenue ?? 0) / 1000).toFixed(0)}K`} icon={DollarSign} variant="warning" />
        </div>
      )}

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
