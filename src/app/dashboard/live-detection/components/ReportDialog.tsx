"use client";

import { Printer } from "lucide-react";

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
      return `
        <tr>
          <td>${displayName(e.className)}</td>
          <td>${panelLabel(e.panelLocation)}</td>
          <td>${e.estimate?.severity ?? "—"}</td>
          <td>${e.estimate?.decision ?? (e.vendors ? "replace" : "—")}</td>
          <td>${e.estimate?.breakdown?.repairMethod?.replace(/_/g, " ") ?? "—"}</td>
          <td class="num">${cost}</td>
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

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(buildPrintHtml(entries, vehicle));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
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

          <div className="flex justify-end pt-2 border-t border-border">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Printer size={14} />
              Download / Print PDF
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
