"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { displayName } from "@/lib/live-detection/classes";
import { PART_DISPLAY } from "@/lib/live-detection/part-segmenter";

import type { LogEntry } from "../hooks/useDamageLog";

interface EstimateDialogProps {
  entry: LogEntry | null;
  onClose: () => void;
}

function panelLabel(panel: string | null | undefined): string {
  if (!panel || panel === "unknown") return "Unknown";
  return (PART_DISPLAY as Record<string, string>)[panel] ?? panel;
}

const DECISION_STYLE: Record<string, string> = {
  repair: "bg-success/15 text-success border-success/30",
  replace: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function EstimateDialog({ entry, onClose }: EstimateDialogProps) {
  const open = entry !== null && entry.estimate !== null;
  const est = entry?.estimate;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Repair cost estimate</DialogTitle>
        </DialogHeader>
        {entry && est && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-semibold text-foreground">
                  {displayName(entry.className)} on {panelLabel(entry.panelLocation)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Severity: <span className="capitalize">{est.severity}</span>
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-md border text-xs font-semibold uppercase tracking-wider ${
                  DECISION_STYLE[est.decision] ?? DECISION_STYLE.unknown
                }`}
              >
                {est.decision}
              </span>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Estimated cost
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums text-foreground">
                {est.cost.toLocaleString()}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  {est.currency}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                Range: {est.costLow.toLocaleString()} – {est.costHigh.toLocaleString()} PKR
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { k: "Method", v: est.breakdown.repairMethod.replace(/_/g, " ") },
                { k: "Labor", v: `${est.breakdown.laborHours} h` },
                { k: "Paint", v: `${est.breakdown.paintCost.toLocaleString()} PKR` },
                { k: "Material", v: est.breakdown.material },
                { k: "Area", v: `${est.breakdown.areaCm2} cm²` },
                { k: "Perimeter", v: `${est.breakdown.perimeterCm} cm` },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5"
                >
                  <span className="text-muted-foreground">{row.k}</span>
                  <span className="font-medium text-foreground">{row.v}</span>
                </div>
              ))}
            </div>

            {est.unknownFeatures.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                Estimate widened due to unknown:{" "}
                <span className="font-medium">{est.unknownFeatures.join(", ")}</span>
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
