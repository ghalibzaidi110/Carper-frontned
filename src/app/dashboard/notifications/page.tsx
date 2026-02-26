"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from "@/hooks/use-api";
import { getTimeAgo } from "@/lib/format";
import { X, CheckCheck, Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const { data: notifData, isLoading } = useNotifications({ limit: 50 });
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();
  const deleteNotif = useDeleteNotification();

  const rawNotifs = notifData?.data || notifData || [];
  const notifications = Array.isArray(rawNotifs) ? rawNotifs : rawNotifs?.data || [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">Notifications</h1>
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-2 text-sm text-primary font-medium hover:underline disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Mark All as Read
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: Record<string, unknown>) => {
              const isRead = (n.isRead || n.read) as boolean;
              return (
                <div
                  key={n.id as string}
                  onClick={() => !isRead && markRead.mutate(n.id as string)}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                    isRead ? "bg-card border-border" : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${isRead ? "bg-muted-foreground/30" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title as string}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message as string}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={n.type as string} />
                      <span className="text-xs text-muted-foreground">{getTimeAgo(n.createdAt as string)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(n.id as string); }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
