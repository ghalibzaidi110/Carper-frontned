"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Printer, Save } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCaptureForEntry } from "@/lib/live-detection/capture-store";
import { displayName } from "@/lib/live-detection/classes";
import { PART_DISPLAY } from "@/lib/live-detection/part-segmenter";
import {
  buildPrintHtml,
  summarizeForPrint,
  type PrintEntry,
} from "@/lib/live-detection/print-report";
import { resolveCategory, type Vehicle } from "@/lib/live-detection/vehicle";

import type { LogEntry } from "../hooks/useDamageLog";
import type { SaveScanState } from "../hooks/useSaveScan";

interface ReportDialogProps {
  open: boolean;
  entries: LogEntry[];
  vehicle: Vehicle;
  onClose: () => void;
  /** Save state lifted to the page so closing the dialog mid-save still tracks. */
  saveState: SaveScanState;
  /** Trigger save — page wires this to useSaveScan().save. */
  onSaveScan: () => void;
}

function panelLabel(panel: string | null | undefined): string {
  if (!panel || panel === "unknown") return "Unknown";
  return (PART_DISPLAY as Record<string, string>)[panel] ?? panel;
}

/**
 * Convert in-memory LogEntry[] into the shared PrintEntry shape the
 * printable expects. Optionally fills `imageUrl` from a pre-built map
 * of dataURLs gathered from IndexedDB.
 */
function toPrintEntries(entries: LogEntry[], imageUrls: Map<number, string>): PrintEntry[] {
  return entries.map((e) => ({
    id: e.id,
    className: e.className,
    panelLocation: e.panelLocation,
    imageUrl: imageUrls.get(e.id) ?? null,
    estimate: e.estimate
      ? {
          cost: e.estimate.cost,
          costLow: e.estimate.costLow,
          costHigh: e.estimate.costHigh,
          severity: e.estimate.severity,
          decision: e.estimate.decision,
          unknownFeatures: e.estimate.unknownFeatures,
          breakdown: e.estimate.breakdown
            ? { repairMethod: e.estimate.breakdown.repairMethod }
            : undefined,
        }
      : null,
    vendors: e.vendors
      ? {
          vendors: e.vendors.vendors ?? null,
          fallbackEstimate: e.vendors.fallbackEstimate
            ? {
                min: e.vendors.fallbackEstimate.min,
                max: e.vendors.fallbackEstimate.max,
                currency: e.vendors.fallbackEstimate.currency,
              }
            : null,
        }
      : null,
    estimateError: e.estimateError,
  }));
}

/**
 * Pull each entry's captured JPEG out of IndexedDB. Runs in parallel —
 * for ~10 entries this is well under a second. Entries with no capture
 * (or a v1 IndexedDB record without entryId) just get omitted from the
 * map; the printable renders a "No photo" placeholder for those.
 */
async function gatherIndexedDbImages(entries: LogEntry[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const lookups = await Promise.all(
    entries.map(async (e) => {
      try {
        const cap = await getCaptureForEntry(e.id);
        return cap?.dataUrl ? ([e.id, cap.dataUrl] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  for (const pair of lookups) if (pair) map.set(pair[0], pair[1]);
  return map;
}

export function ReportDialog({
  open,
  entries,
  vehicle,
  onClose,
  saveState,
  onSaveScan,
}: ReportDialogProps) {
  // Reuse the shared print summary helper so the dialog totals and the
  // printed report are guaranteed to match.
  const printEntries = toPrintEntries(entries, new Map());
  const summary = summarizeForPrint(printEntries);
  const saving = saveState.status === "preparing" || saveState.status === "uploading";
  const saved = saveState.status === "saved";
  const [printing, setPrinting] = useState(false);

  /**
   * Open a printable HTML window. Loads the IndexedDB-captured damage
   * photos first so the gallery isn't empty on freshly-logged scans
   * (the photos haven't been uploaded to Cloudinary yet at this point).
   */
  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const images = await gatherIndexedDbImages(entries);
      const html = buildPrintHtml(toPrintEntries(entries, images), {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        category: resolveCategory(vehicle),
      });
      const w = window.open("", "_blank");
      if (!w) {
        // Popup blocker — fall back to download. The user has to open
        // the file manually but at least gets the report.
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `carper-damage-report-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      // Give the print window a moment to lay out images before
      // triggering the print dialog.
      setTimeout(() => w.print(), 600);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Damage report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {vehicle.year} {vehicle.make} {vehicle.model} · {entries.length} item(s)
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-baseline justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Total estimate
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                Range {summary.low.toLocaleString()} – {summary.high.toLocaleString()} PKR
              </p>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {summary.total.toLocaleString()}{" "}
              <span className="text-base font-normal text-muted-foreground">PKR</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Damage</th>
                  <th className="py-2 pr-4 font-medium">Panel</th>
                  <th className="py-2 pr-4 font-medium">Severity</th>
                  <th className="py-2 pr-4 font-medium">Decision</th>
                  <th className="py-2 pr-4 font-medium">Method</th>
                  <th className="py-2 pr-4 font-medium text-right">Cost (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const cost = e.estimate?.cost
                    ? e.estimate.cost.toLocaleString()
                    : e.vendors?.vendors?.[0]?.price
                      ? e.vendors.vendors[0].price.toLocaleString()
                      : e.vendors?.fallbackEstimate
                        ? `${e.vendors.fallbackEstimate.min.toLocaleString()}–${e.vendors.fallbackEstimate.max.toLocaleString()}`
                        : "—";
                  return (
                    <tr key={e.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-foreground">
                        {displayName(e.className)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {panelLabel(e.panelLocation)}
                      </td>
                      <td className="py-2 pr-4 capitalize text-muted-foreground">
                        {e.estimate?.severity ?? "—"}
                      </td>
                      <td className="py-2 pr-4 capitalize text-muted-foreground">
                        {e.estimate?.decision ?? (e.vendors ? "replace" : "—")}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {e.estimate?.breakdown.repairMethod?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums text-foreground">
                        {cost}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between gap-2 pt-2 border-t border-border">
            {/* Save scan — left side. Disabled while in flight; once saved, becomes a link. */}
            {saved && saveState.savedScanId ? (
              <Link
                href={`/dashboard/scans/${saveState.savedScanId}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle2 size={14} />
                Saved · View
                <ExternalLink size={12} className="opacity-70" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSaveScan}
                disabled={saving || entries.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving
                  ? saveState.status === "preparing"
                    ? `Preparing… ${saveState.current}`
                    : `Uploading… ${saveState.total} image${saveState.total === 1 ? "" : "s"}`
                  : "Save scan"}
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              disabled={printing || entries.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              {printing ? "Preparing photos…" : "Download / Print PDF"}
            </button>
          </div>

          {saveState.status === "error" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              ⚠ Save failed: {saveState.error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
