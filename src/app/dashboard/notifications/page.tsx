"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { DUMMY_NOTIFICATIONS } from "@/data/dummy";
import { useAuth } from "@/contexts/AuthContext";
import { getTimeAgo } from "@/lib/format";
import { X, CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const notifications = DUMMY_NOTIFICATIONS.filter((n) => n.userId === user?.id);

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">Notifications</h1>
          <button className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
            <CheckCheck size={16} />
            Mark All as Read
          </button>
        </div>

        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
              n.read ? "bg-card border-border" : "bg-primary/5 border-primary/20"
            }`}>
              <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={n.type} />
                  <span className="text-xs text-muted-foreground">{getTimeAgo(n.createdAt)}</span>
                </div>
              </div>
              <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
