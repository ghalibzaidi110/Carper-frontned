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

/**
 * Format the damage size for the UI, choosing the most honest unit
 * for the measurement source we have available.
 *
 *  - panel_reference  → real cm² from panel-as-ruler scaling
 *  - client_provided / fallback_estimate → percentage of frame
 *    (showing fabricated cm² would imply precision we don't have)
 */
function formatDamageSize(
  entry: LogEntry | null,
  cm2: number,
  scaleSource?: string,
): string {
  if (scaleSource === "webxr_depth") {
    return `${cm2.toFixed(0)} cm² (AR measured)`;
  }
  if (scaleSource === "panel_reference") {
    return `${cm2.toFixed(0)} cm² (panel-anchored)`;
  }
  if (!entry) return "—";
  const [, , w, h] = entry.bbox;
  const bboxArea = (w ?? 0) * (h ?? 0);
  const frameArea = entry.frameSize
    ? entry.frameSize[0] * entry.frameSize[1]
    : 1280 * 720;
  const pct = bboxArea > 0 ? (bboxArea / frameArea) * 100 : 0;
  return `~${pct.toFixed(1)}% of frame`;
}

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
                  {est.severityDetail
                    ? est.severityDetail
                    : <>Severity: <span className="capitalize">{est.severity}</span></>}
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
                Estimated cost range
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums text-foreground">
                {est.costLow.toLocaleString()}
                <span className="mx-2 text-muted-foreground/70 text-2xl font-normal">–</span>
                {est.costHigh.toLocaleString()}
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  {est.currency}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                Approx. {est.cost.toLocaleString()} {est.currency} (median estimate)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { k: "Method", v: est.breakdown.repairMethod.replace(/_/g, " ") },
                { k: "Labor", v: `${est.breakdown.laborHours} h` },
                {
                  k: "Paint",
                  v: `${est.breakdown.paintCost.toLocaleString()} ${est.currency}`,
                },
                { k: "Material", v: est.breakdown.material },
                {
                  // When panel-as-ruler succeeds, show the real cm². When
                  // it falls back to fixed-distance estimation, switch to a
                  // percentage of frame so we don't imply precision we
                  // don't have.
                  k: "Damage size",
                  v: formatDamageSize(
                    entry,
                    est.breakdown.areaCm2,
                    est.breakdown.scaleSource,
                  ),
                },
                {
                  k: "Severity",
                  v: <span className="capitalize">{est.breakdown.severityScore}</span>,
                },
                // Depth info — shown when depth measurement is available
                ...(est.breakdown.depthMm != null
                  ? [{
                      k: "Dent depth",
                      v: `${est.breakdown.depthMm.toFixed(1)} mm (AR sensor)`,
                    }]
                  : est.breakdown.depthSource === "depth_model"
                    ? [{
                        k: "Dent depth",
                        v: <span className="capitalize">{est.breakdown.severityScore === "deep" ? "Deep" : "Shallow"} (AI estimate)</span>,
                      }]
                    : []),
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

            {est.estimateConfidence !== undefined && est.estimateConfidence < 0.5 && (
              <p className="text-xs text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                <span className="font-medium">Low confidence estimate</span>
                {" — "}
                {est.confidenceDetail
                  ?? `${Math.round(est.estimateConfidence * 100)}%. Too many inputs are unknown or approximate.`}
                {" "}Try re-scanning with the full panel visible and selecting the correct vehicle.
              </p>
            )}

            {est.estimateConfidence !== undefined && est.estimateConfidence >= 0.5 &&
              est.confidenceDetail && (
              <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
                {est.confidenceDetail}
              </p>
            )}

            {est.breakdown.scaleSource === "webxr_depth" && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">
                Measurements taken via AR depth sensor (highest accuracy).
              </p>
            )}

            {est.breakdown.scaleSource === "fallback_estimate" && (
              <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
                <span className="font-medium text-foreground">Note:</span> the
                damage size used for this estimate is approximate (the affected
                panel wasn&apos;t fully visible to use as a real-world ruler).
                Re-scan with the entire panel in frame for a more accurate cost.
              </p>
            )}

            {est.modelVersion && (
              <p className="text-[10px] text-muted-foreground/70 text-right tabular-nums">
                Estimate produced by cost model {est.modelVersion}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
