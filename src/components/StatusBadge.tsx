import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success border-success/20",
  SOLD: "bg-muted text-muted-foreground border-border",
  INACTIVE: "bg-muted text-muted-foreground border-border",
  COMPLETED: "bg-info/10 text-info border-info/20",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
  SUSPENDED: "bg-destructive/10 text-destructive border-destructive/20",
  NEW: "bg-primary/10 text-primary border-primary/20",
  USED: "bg-warning/10 text-warning border-warning/20",
  DAMAGED: "bg-destructive/10 text-destructive border-destructive/20",
  VERIFIED: "bg-success/10 text-success border-success/20",
  PENDING: "bg-warning/10 text-warning border-warning/20",
  UNVERIFIED: "bg-muted text-muted-foreground border-border",
  SUCCESS: "bg-success/10 text-success border-success/20",
  INFO: "bg-info/10 text-info border-info/20",
  WARNING: "bg-warning/10 text-warning border-warning/20",
  SYSTEM: "bg-muted text-muted-foreground border-border",
  INDIVIDUAL: "bg-primary/10 text-primary border-primary/20",
  CAR_RENTAL: "bg-info/10 text-info border-info/20",
  ADMIN: "bg-warning/10 text-warning border-warning/20",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border",
        statusStyles[status] || "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
};

export default StatusBadge;
