"use client";

import { Download, Printer } from "lucide-react";
import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { displayName } from "@/lib/live-detection/classes";
import { PART_DISPLAY } from "@/lib/live-detection/part-segmenter";
import type { Vehicle } from "@/lib/live-detection/vehicle";

import type { LogEntry } from "../hooks/useDamageLog";

interface ReportDialogProps {
  open: boolean;
  entries: LogEntry[];
  vehicle: Vehicle;
  onClose: () => void;
}

const USD_TO_PKR = 278;

function panelLabel(panel: string | null | undefined): string {
  if (!panel || panel === "unknown") return "Unknown";
  return (PART_DISPLAY as Record<string, string>)[panel] ?? panel;
}

interface RowSummary {
  total: number;
  low: number;
  high: number;
}

/**
 * Each row in the report ends up in one of four display states. Splitting
 * this out so the dialog table and the printable HTML render the same
 * thing, and so a row that errored or was never estimated is no longer
 * indistinguishable from a successful one.
 */
type RowState =
  | { kind: "estimated" }       // cost-estimate API succeeded
  | { kind: "vendor" }          // vendor search succeeded (with vendors or fallback)
  | { kind: "error"; message: string }   // estimate ran but failed
  | { kind: "pending" };        // never run (user opened report before clicking Estimate all)

function rowState(e: LogEntry): RowState {
  if (e.estimate) return { kind: "estimated" };
  if (e.vendors) return { kind: "vendor" };
  if (e.estimateError) return { kind: "error", message: e.estimateError };
  return { kind: "pending" };
}

/** HTML-escape user-controlled text before splicing into the print template. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function summarize(entries: LogEntry[]): RowSummary {
  let total = 0;
  let low = 0;
  let high = 0;
  for (const e of entries) {
    if (e.estimate) {
      total += e.estimate.cost;
      low += e.estimate.costLow;
      high += e.estimate.costHigh;
    } else if (e.vendors?.vendors?.length) {
      const cheapest = e.vendors.vendors[0];
      const priced = cheapest.currency === "USD" ? cheapest.price * USD_TO_PKR : cheapest.price;
      total += priced;
      low += priced;
      high += priced * 1.15;
    } else if (e.vendors?.fallbackEstimate) {
      const f = e.vendors.fallbackEstimate;
      total += (f.min + f.max) / 2;
      low += f.min;
      high += f.max;
    }
  }
  return { total: Math.round(total), low: Math.round(low), high: Math.round(high) };
}

function buildPrintHtml(entries: LogEntry[], vehicle: Vehicle): string {
  const summary = summarize(entries);
  const date = new Date().toLocaleString();
  const rows = entries
    .map((e) => {
      const state = rowState(e);
      const damage = escapeHtml(displayName(e.className));
      const panel = escapeHtml(panelLabel(e.panelLocation));

      // For errored / pending rows, collapse the middle cells into a
      // single colspan'd note. This is what was missing before: a row
      // that failed used to look identical to one waiting to be run.
      if (state.kind === "error") {
        return `
        <tr>
          <td>${damage}</td>
          <td>${panel}</td>
          <td colspan="5" class="small note-error">Estimate unavailable: ${escapeHtml(state.message)}</td>
        </tr>`;
      }
      if (state.kind === "pending") {
        return `
        <tr>
          <td>${damage}</td>
          <td>${panel}</td>
          <td colspan="5" class="small note-pending">Not estimated</td>
        </tr>`;
      }

      // Successful row.
      const cost = e.estimate
        ? `${e.estimate.cost.toLocaleString()} PKR`
        : e.vendors?.vendors?.[0]
          ? `${e.vendors.vendors[0].price.toLocaleString()} ${e.vendors.vendors[0].currency}`
          : e.vendors?.fallbackEstimate
            ? `${e.vendors.fallbackEstimate.min.toLocaleString()}–${e.vendors.fallbackEstimate.max.toLocaleString()} PKR`
            : "—";
      const range = e.estimate
        ? `${e.estimate.costLow.toLocaleString()}–${e.estimate.costHigh.toLocaleString()}`
        : "";
      // (Change 5) When the cost ran without a known panel, Python
      // returns `unknownFeatures: ["panelLocation"]` — surface a small
      // italic note so the printed report is honest about which rows
      // are at the wider-margin precision tier.
      const panelDefaulted = e.estimate?.unknownFeatures?.includes("panelLocation");
      const panelNote = panelDefaulted
        ? `<div class="small note-defaulted">(panel auto-defaulted)</div>`
        : "";
      return `
        <tr>
          <td>${damage}</td>
          <td>${panel}</td>
          <td>${escapeHtml(e.estimate?.severity ?? "—")}</td>
          <td>${escapeHtml(e.estimate?.decision ?? (e.vendors ? "replace" : "—"))}</td>
          <td>${escapeHtml(e.estimate?.breakdown?.repairMethod?.replace(/_/g, " ") ?? "—")}</td>
          <td class="num">${cost}${panelNote}</td>
          <td class="num small">${range}</td>
        </tr>`;
    })
    .join("");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Carper damage report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 920px; margin: 24px auto; padding: 0 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px 0; }
  .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e5e5; }
  th { background: #f5f5f5; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .small { font-size: 11px; color: #666; }
  .note-error { color: #b91c1c; font-style: italic; }
  .note-pending { color: #888; font-style: italic; }
  .note-defaulted { color: #888; font-style: italic; font-weight: 400; margin-top: 2px; }
  .totals { margin-top: 18px; padding: 14px 16px; background: #f5f5f5; border-radius: 8px; display: flex; justify-content: space-between; align-items: baseline; }
  .totals .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; }
  .totals .amount { font-size: 22px; font-weight: 700; }
  .totals .range { font-size: 12px; color: #555; margin-top: 2px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>Carper Damage Report</h1>
  <p class="meta">Generated ${date} · Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} · ${entries.length} item(s)</p>
  <table>
    <thead>
      <tr>
        <th>Damage</th>
        <th>Panel</th>
        <th>Severity</th>
        <th>Decision</th>
        <th>Method</th>
        <th class="num">Cost</th>
        <th class="num">Range</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div>
      <div class="label">Total estimate</div>
      <div class="range">Range ${summary.low.toLocaleString()} – ${summary.high.toLocaleString()} PKR</div>
    </div>
    <div class="amount">${summary.total.toLocaleString()} PKR</div>
  </div>
</body>
</html>`;
}

export function ReportDialog({ open, entries, vehicle, onClose }: ReportDialogProps) {
  const summary = summarize(entries);
  // Tally the per-row outcomes so the dialog can surface "N of M
  // estimated, K failed, P pending" at the top. Otherwise the user has
  // to scan the table to count blank rows manually.
  const counts = entries.reduce(
    (acc, e) => {
      const s = rowState(e);
      acc[s.kind]++;
      return acc;
    },
    { estimated: 0, vendor: 0, error: 0, pending: 0 } as Record<RowState["kind"], number>,
  );
  const succeeded = counts.estimated + counts.vendor;
  const hasIssues = counts.error > 0 || counts.pending > 0;
  // D-5: surface a one-line message under the print button when the
  // browser's popup blocker prevented `window.open` and we fell back to
  // an HTML download. Cleared automatically next time the user clicks.
  const [popupBlockedNotice, setPopupBlockedNotice] = useState<string | null>(null);

  /**
   * D-5: download the print-ready HTML to disk as a fallback for users
   * whose browser blocked the popup. Same content as the popup, just
   * delivered as a .html file in their Downloads folder.
   */
  const downloadAsHtml = (html: string) => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carper-damage-report-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a tick so the browser actually has time to start the
    // download before we invalidate the URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePrint = () => {
    const html = buildPrintHtml(entries, vehicle);
    const w = window.open("", "_blank");
    if (!w) {
      // D-5: popup blocker tripped. Fall back to a download so the user
      // isn't stuck on a button that does nothing. Modern browsers block
      // popups on most click handlers by default, so this path is hit
      // for the majority of users — the fallback is the primary UX, not
      // an edge case.
      downloadAsHtml(html);
      setPopupBlockedNotice(
        "Popup blocked by your browser — the report was downloaded instead. Open it from your Downloads folder.",
      );
      return;
    }
    setPopupBlockedNotice(null);
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const handleDownload = () => {
    downloadAsHtml(buildPrintHtml(entries, vehicle));
    setPopupBlockedNotice(null);
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
              <p className="text-[11px] text-muted-foreground mt-1">
                {succeeded} of {entries.length} estimated
                {counts.error > 0 && (
                  <>
                    {" · "}
                    <span className="text-destructive">{counts.error} failed</span>
                  </>
                )}
                {counts.pending > 0 && <> · {counts.pending} pending</>}
              </p>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {summary.total.toLocaleString()}{" "}
              <span className="text-base font-normal text-muted-foreground">PKR</span>
            </p>
          </div>

          {hasIssues && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Some entries don't have an estimate. The total above is for the {succeeded}{" "}
              that succeeded — the failed/pending rows below explain why they're blank.
            </div>
          )}

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
                  const state = rowState(e);

                  // Errored row — show why this entry has no estimate so
                  // the user can fix the upstream cause instead of seeing
                  // a polished-looking dash.
                  if (state.kind === "error") {
                    return (
                      <tr key={e.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-foreground">
                          {displayName(e.className)}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {panelLabel(e.panelLocation)}
                        </td>
                        <td colSpan={4} className="py-2 pr-4 text-destructive italic text-[11px]">
                          ⚠ Estimate unavailable: {state.message}
                        </td>
                      </tr>
                    );
                  }

                  // Never-estimated row — distinct from "errored" so the
                  // user knows whether to retry or whether something
                  // genuinely failed.
                  if (state.kind === "pending") {
                    return (
                      <tr key={e.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-foreground">
                          {displayName(e.className)}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {panelLabel(e.panelLocation)}
                        </td>
                        <td colSpan={4} className="py-2 pr-4 text-muted-foreground italic text-[11px]">
                          Not estimated yet — click "Estimate all".
                        </td>
                      </tr>
                    );
                  }

                  // Normal happy path.
                  const cost = e.estimate?.cost
                    ? e.estimate.cost.toLocaleString()
                    : e.vendors?.vendors?.[0]?.price
                      ? e.vendors.vendors[0].price.toLocaleString()
                      : e.vendors?.fallbackEstimate
                        ? `${e.vendors.fallbackEstimate.min.toLocaleString()}–${e.vendors.fallbackEstimate.max.toLocaleString()}`
                        : "—";
                  // (Change 5) Surface reduced-precision rows with a
                  // small italic note. `unknownFeatures` includes
                  // "panelLocation" exactly when the cost ran without
                  // a known panel — i.e. the +7% widening tier.
                  const panelDefaulted = e.estimate?.unknownFeatures?.includes("panelLocation");
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
                        <div>{cost}</div>
                        {panelDefaulted && (
                          <div className="text-[10px] italic text-muted-foreground/80 font-normal mt-0.5">
                            (panel auto-defaulted)
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {popupBlockedNotice && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              {popupBlockedNotice}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              title="Save the report as an HTML file"
            >
              <Download size={14} />
              Download HTML
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Printer size={14} />
              Print PDF
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
