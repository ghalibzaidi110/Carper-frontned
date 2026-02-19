"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { DUMMY_CARS, DUMMY_NOTIFICATIONS, DUMMY_RENTALS } from "@/data/dummy";
import { Car, ShoppingCart, ScanSearch, Bell, Truck, DollarSign, BarChart3 } from "lucide-react";
import { getTimeAgo } from "@/lib/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const userCars = DUMMY_CARS.filter((c) => c.userId === user?.id);
  const userNotifications = DUMMY_NOTIFICATIONS.filter((n) => n.userId === user?.id);
  const unread = userNotifications.filter((n) => !n.read).length;
  const isRental = user?.role === "CAR_RENTAL";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0]}!</h1>
          <p className="text-sm text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your vehicles.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Cars" value={userCars.length} icon={Car} variant="primary" />
          <StatCard title="Active Listings" value={1} icon={ShoppingCart} variant="success" />
          <StatCard title="Damage Scans" value={4} icon={ScanSearch} variant="warning" />
          <StatCard title="Notifications" value={unread} icon={Bell} variant="info" />
        </div>

        {isRental && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Active Rentals" value={DUMMY_RENTALS.filter((r) => r.status === "ACTIVE").length} icon={Truck} variant="primary" />
            <StatCard title="Completed Rentals" value={DUMMY_RENTALS.filter((r) => r.status === "COMPLETED").length} icon={BarChart3} variant="success" />
            <StatCard title="Total Revenue" value="₨ 60K" icon={DollarSign} variant="warning" />
            <StatCard title="Fleet Size" value={userCars.length} icon={Car} variant="info" />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Recent Notifications</h3>
            <div className="space-y-3">
              {userNotifications.slice(0, 4).map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={n.type} />
                      <span className="text-xs text-muted-foreground">{getTimeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Your Cars</h3>
            <div className="space-y-3">
              {userCars.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Car size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.manufacturer} {c.model} {c.year}</p>
                    <p className="text-xs text-muted-foreground">{c.registrationNumber}</p>
                  </div>
                  <StatusBadge status={c.condition} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
