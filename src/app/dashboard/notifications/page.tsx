"use client";

import { useState } from "react";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/hooks/use-api";
import { getTimeAgo } from "@/lib/format";
import {
  X,
  CheckCheck,
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Settings,
  BellOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "all" | "unread";

const TYPE_META: Record<string, { icon: LucideIcon; tone: string }> = {
  INFO: { icon: Info, tone: "text-info bg-info/10" },
  SUCCESS: { icon: CheckCircle2, tone: "text-success bg-success/10" },
  WARNING: { icon: AlertTriangle, tone: "text-warning bg-warning/10" },
  ERROR: { icon: XCircle, tone: "text-destructive bg-destructive/10" },
  SYSTEM: { icon: Settings, tone: "text-muted-foreground bg-muted" },
};

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("all");

  const { data: notifData, isLoading } = useNotifications({
    limit: 50,
    unreadOnly: tab === "unread",
  });
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();
  const deleteNotif = useDeleteNotification();

  const rawNotifs = notifData?.data || notifData || [];
  const notifications = Array.isArray(rawNotifs) ? rawNotifs : rawNotifs?.data || [];
  const unreadCount = (notifData?.unreadCount as number | undefined) ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}.`
              : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {markAllRead.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCheck size={16} />
            )}
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
            {t === "unread" && unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-border">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <BellOff size={26} className="text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">
            {tab === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "unread"
              ? "You're all caught up. New activity will appear here."
              : "We'll let you know when something happens."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: Record<string, unknown>) => {
            const isRead = (n.isRead || n.read) as boolean;
            const type = (n.type as string)?.toUpperCase() || "INFO";
            const meta = TYPE_META[type] || TYPE_META.INFO;
            const Icon = meta.icon;

            return (
              <div
                key={n.id as string}
                onClick={() => !isRead && markRead.mutate(n.id as string)}
                className={cn(
                  "group flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer",
                  isRead
                    ? "bg-card border-border hover:bg-muted/40"
                    : "bg-primary/5 border-primary/20 hover:bg-primary/10",
                )}
              >
                {/* Type icon */}
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    meta.tone,
                  )}
                >
                  <Icon size={18} />
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm truncate",
                        isRead ? "font-medium text-foreground" : "font-semibold text-foreground",
                      )}
                    >
                      {n.title as string}
                    </p>
                    {!isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {n.message as string}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {getTimeAgo(n.createdAt as string)}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotif.mutate(n.id as string);
                  }}
                  title="Delete"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
