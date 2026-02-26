"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { useAdminStats } from "@/hooks/use-api";
import { Users, Car, ShoppingCart, Truck, Shield, Ban, BarChart3, TrendingUp, Loader2 } from "lucide-react";

export default function AdminStatsPage() {
  const { data: stats, isLoading } = useAdminStats();

  const users = stats?.users || {};
  const cars = stats?.cars || {};
  const listings = stats?.listings || {};
  const rentals = stats?.rentals || {};

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground">Platform Statistics</h1>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Users" value={users.total ?? 0} icon={Users} variant="primary" />
              <StatCard title="Individuals" value={users.individuals ?? 0} icon={Users} variant="info" />
              <StatCard title="Car Rentals" value={users.rentalBusinesses ?? 0} icon={Truck} variant="success" />
              <StatCard title="Pending Verifications" value={users.pendingVerifications ?? 0} icon={Shield} variant="warning" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Active Listings" value={listings.active ?? 0} icon={ShoppingCart} variant="primary" />
              <StatCard title="Active Rentals" value={rentals.active ?? 0} icon={Truck} variant="info" />
              <StatCard title="Suspended Users" value={users.suspended ?? 0} icon={Ban} variant="warning" />
              <StatCard title="Total Cars" value={cars.total ?? 0} icon={Car} variant="success" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border shadow-card p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">User Growth</h3>
                <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <TrendingUp size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {users.total ? `${users.total} total users on platform` : "No data yet"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border shadow-card p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">Listings Overview</h3>
                <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <BarChart3 size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {listings.total ? `${listings.total} total listings, ${listings.active} active` : "No data yet"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
