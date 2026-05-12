"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Car, Users, Shield,
  BarChart3, Bell, UserCircle, LogOut, Menu, X, Truck, Camera, ChevronDown, FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/use-api";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL", "ADMIN"] },
  { label: "Live Detection", path: "/dashboard/live-detection", icon: <Camera size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL"] },
  { label: "My Scans", path: "/dashboard/scans", icon: <FolderOpen size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL"] },
  // Rentals link hidden from the FYP-scope sidebar (individual-user-only).
  // The rentals module + pages still exist in the codebase for the
  // long-term multi-stakeholder roadmap — re-add this NavItem to surface
  // them again. See docs/REMAINING.md item 2.5.
  // { label: "Rentals", path: "/dashboard/rentals", icon: <Truck size={20} />, roles: ["CAR_RENTAL"] },
  { label: "Users", path: "/admin/users", icon: <Users size={20} />, roles: ["ADMIN"] },
  { label: "Verifications", path: "/admin/verifications", icon: <Shield size={20} />, roles: ["ADMIN"] },
  { label: "Car Catalog", path: "/admin/catalog", icon: <Car size={20} />, roles: ["ADMIN"] },
  { label: "Platform Stats", path: "/admin/stats", icon: <BarChart3 size={20} />, roles: ["ADMIN"] },
  { label: "Notifications", path: "/dashboard/notifications", icon: <Bell size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL"] },
  { label: "Profile", path: "/dashboard/profile", icon: <UserCircle size={20} />, roles: ["INDIVIDUAL", "CAR_RENTAL", "ADMIN"] },
];

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const { data: unreadData } = useUnreadCount(!loading && !!user);
  const unreadCount = unreadData?.unreadCount ?? 0;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);

  if (loading || !user) return null;

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const expanded = hoverExpanded || mobileOpen;

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    router.push("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setHoverExpanded(true)}
        onMouseLeave={() => setHoverExpanded(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar flex flex-col border-r border-sidebar-border",
          "transition-all duration-300 ease-out",
          // Mobile: slide in/out at full width
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
          // Desktop: always visible, width depends on hover
          "lg:translate-x-0",
          expanded ? "lg:w-64" : "lg:w-16",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-20 px-4 border-b border-sidebar-border overflow-hidden">
          <img
            src="/mainlogo.png"
            alt="Carper logo"
            style={{ width: 64, height: 64 }}
            className="rounded-xl flex-shrink-0 shadow-md object-contain"
          />
          <div
            className={cn(
              "min-w-0 transition-opacity duration-200",
              expanded ? "opacity-100" : "opacity-0",
            )}
          >
            <p className="font-display font-bold text-base text-sidebar-primary-foreground tracking-wide whitespace-nowrap">
              Carper
            </p>
            <p className="text-[11px] text-sidebar-accent-foreground/80 whitespace-nowrap">
              AI Damage Detection
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-5 px-3 space-y-1.5">
          {filteredNav.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                title={!expanded ? item.label : undefined}
                className={cn(
                  "relative flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap overflow-hidden",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {/* Left-edge accent bar for active item */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                )}
                <span className="flex-shrink-0">{item.icon}</span>
                <span
                  className={cn(
                    "flex-1 transition-opacity duration-200",
                    expanded ? "opacity-100" : "opacity-0",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-out",
          expanded ? "lg:pl-64" : "lg:pl-16",
        )}
      >
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="font-display text-lg font-semibold text-foreground">
              {filteredNav.find((n) => n.path === pathname)?.label || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Bell size={20} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* Profile dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border hover:bg-muted transition-colors"
              >
                <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {user.name.charAt(0)}
                </span>
                <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                  {user.name}
                </span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-muted-foreground transition-transform",
                    profileOpen && "rotate-180",
                  )}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-elevated overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide">
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <UserCircle size={16} />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
