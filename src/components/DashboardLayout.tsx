"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Car, ScanSearch, ShoppingCart, Users, Shield,
  BarChart3, Bell, UserCircle, LogOut, Menu, X, Truck, Package
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL", "ADMIN"] },
  { label: "My Cars", path: "/dashboard/cars", icon: <Car size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL"] },
  { label: "Damage Detection", path: "/dashboard/detection", icon: <ScanSearch size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL"] },
  { label: "My Listings", path: "/dashboard/listings", icon: <ShoppingCart size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL"] },
  { label: "Rentals", path: "/dashboard/rentals", icon: <Truck size={20} />, roles: ["CAR_RENTAL"] },
  { label: "Marketplace", path: "/marketplace", icon: <Package size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL"] },
  { label: "Users", path: "/admin/users", icon: <Users size={20} />, roles: ["ADMIN"] },
  { label: "Verifications", path: "/admin/verifications", icon: <Shield size={20} />, roles: ["ADMIN"] },
  { label: "Car Catalog", path: "/admin/catalog", icon: <Car size={20} />, roles: ["ADMIN"] },
  { label: "Platform Stats", path: "/admin/stats", icon: <BarChart3 size={20} />, roles: ["ADMIN"] },
  { label: "Notifications", path: "/dashboard/notifications", icon: <Bell size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL"] },
  { label: "Profile", path: "/dashboard/profile", icon: <UserCircle size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL", "ADMIN"] },
];

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  if (!user) return null;

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Car size={20} className="text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-sidebar-primary-foreground">AutoInspect</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-accent-foreground">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground truncate">{user.role.replace("_", " ")}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-sidebar-foreground hover:text-destructive rounded-lg hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden lg:block">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {filteredNav.find((n) => n.path === pathname)?.label || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell size={20} className="text-muted-foreground" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            </button>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
