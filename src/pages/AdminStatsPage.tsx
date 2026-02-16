import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Users, Car, ShoppingCart, Truck, Shield, Ban, BarChart3, TrendingUp } from "lucide-react";

const AdminStatsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground">Platform Statistics</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value="1,250" icon={Users} variant="primary" trend="+12% this month" />
          <StatCard title="Individuals" value="1,100" icon={Users} variant="info" />
          <StatCard title="Car Rentals" value="148" icon={Truck} variant="success" />
          <StatCard title="Pending Verifications" value="23" icon={Shield} variant="warning" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Listings" value="180" icon={ShoppingCart} variant="primary" />
          <StatCard title="Active Rentals" value="45" icon={Truck} variant="info" />
          <StatCard title="Suspended Users" value="12" icon={Ban} variant="warning" />
          <StatCard title="Total Cars" value="850" icon={Car} variant="success" />
        </div>

        {/* Chart placeholder */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">User Growth</h3>
            <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg">
              <div className="text-center">
                <TrendingUp size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Chart will be connected to real data</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Listings Overview</h3>
            <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg">
              <div className="text-center">
                <BarChart3 size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Chart will be connected to real data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminStatsPage;
