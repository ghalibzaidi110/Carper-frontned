"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ImageIcon,
  Loader2,
  Printer,
  Trash2,
} from "lucide-react";

import { displayName } from "@/lib/live-detection/classes";
import { PART_DISPLAY } from "@/lib/live-detection/part-segmenter";
import {
  buildPrintHtml,
  type PrintEntry,
} from "@/lib/live-detection/print-report";
import { formatPKR, getTimeAgo } from "@/lib/format";
import {
  liveDetectionScansService,
  type SavedScanDetail,
} from "@/services/live-detection.service";

function panelLabel(panel: string | null | undefined): string {
  if (!panel || panel === "unknown") return "Unknown";
  return (PART_DISPLAY as Record<string, string>)[panel] ?? panel;
}

export default function SavedScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scanId = params?.id;

  const [scan, setScan] = useState<SavedScanDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!scanId) return;
    void liveDetectionScansService
      .getOne(scanId)
      .then((res) => setScan(res))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [scanId]);

  async function handleDelete() {
    if (!scanId) return;
    if (!confirm("Delete this saved scan? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await liveDetectionScansService.deleteOne(scanId);
      router.push("/dashboard/scans");
    } catch (err) {
      alert(`Couldn't delete: ${err instanceof Error ? err.message : String(err)}`);
      setDeleting(false);
    }
  }

  /**
   * Open the printable HTML in a new tab. Uses the same shared template
   * as the live-detection Report Dialog so saved scans and live scans
   * print identically. Cloudinary image URLs from `detectionsJson` are
   * passed through directly — the template renders them in the gallery.
   */
  function handlePrint() {
    if (!scan) return;
    const printEntries: PrintEntry[] = scan.detectionsJson.map((e) => ({
      id: e.id,
      className: e.className,
      panelLocation: e.panelLocation,
      imageUrl: e.imageUrl ?? null,
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
    const html = buildPrintHtml(
      printEntries,
      {
        make: scan.vehicleMake,
        model: scan.vehicleModel,
        year: scan.vehicleYear,
        category: scan.vehicleCategory,
      },
      { date: new Date(scan.createdAt), reportId: `RPT-${scan.id.slice(0, 8).toUpperCase()}` },
    );
    const w = window.open("", "_blank");
    if (!w) {
      // Popup blocker — fall back to download.
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carper-damage-report-${scan.id}.html`;
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
    // Cloudinary images need a beat to load before print fires; the
    // images are eager-loaded but cross-origin so the browser still
    // does a real network fetch in the print window.
    setTimeout(() => w.print(), 1200);
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <BackLink />
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Couldn&apos;t load scan</p>
            <p className="text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="space-y-6 animate-fade-in">
        <BackLink />
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const succeeded = scan.entryCount - scan.failedCount;

  return (
    <div className="space-y-6 animate-fade-in">
      <BackLink />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {scan.vehicleYear} {scan.vehicleMake} {scan.vehicleModel}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Saved {getTimeAgo(scan.createdAt)} · {scan.entryCount} damage
            {scan.entryCount === 1 ? "" : "s"} logged
            {scan.failedCount > 0 && (
              <span className="text-destructive"> · {scan.failedCount} failed</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 disabled:opacity-50 transition-colors"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>

      {/* Total card */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Total estimate
          </p>
          <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
            Range {formatPKR(scan.totalLowPkr)} – {formatPKR(scan.totalHighPkr)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {succeeded} of {scan.entryCount} estimated
            {scan.failedCount > 0 && (
              <span className="text-destructive"> · {scan.failedCount} failed</span>
            )}
            {scan.costModelVersion && <> · cost model {scan.costModelVersion}</>}
          </p>
        </div>
        <p className="text-3xl font-bold font-mono tabular-nums text-foreground">
          {scan.totalCostPkr.toLocaleString()}{" "}
          <span className="text-base font-normal text-muted-foreground">PKR</span>
        </p>
      </div>

      {/* Gallery */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Damages</h2>
        {Array.isArray(scan.detectionsJson) && scan.detectionsJson.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scan.detectionsJson.map((entry, i) => (
              <DamageCard key={entry?.id ?? i} entry={entry} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No damage entries on this scan.</p>
        )}
      </div>

      {scan.notes && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Notes
          </h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{scan.notes}</p>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/scans"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors print:hidden"
    >
      <ArrowLeft size={14} />
      All scans
    </Link>
  );
}

interface DamageCardProps {
  entry: SavedScanDetail["detectionsJson"][number];
}

function DamageCard({ entry }: DamageCardProps) {
  if (!entry) return null;
  const cost = entry.estimate?.cost
    ? formatPKR(entry.estimate.cost)
    : entry.vendors?.vendors?.[0]?.price
      ? formatPKR(entry.vendors.vendors[0].price)
      : entry.vendors?.fallbackEstimate
        ? `${formatPKR(entry.vendors.fallbackEstimate.min)}–${formatPKR(
            entry.vendors.fallbackEstimate.max,
          )}`
        : null;

  // Guard: unknownFeatures may be null/undefined or non-array on old/odd
  // records. Array.isArray + optional chain prevents a render crash.
  const panelDefaulted =
    Array.isArray(entry.estimate?.unknownFeatures) &&
    entry.estimate.unknownFeatures.includes("panelLocation");

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {entry.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.imageUrl}
          alt={displayName(entry.className)}
          className="w-full h-44 object-cover bg-muted/40"
        />
      ) : (
        <div className="w-full h-44 bg-muted/40 flex items-center justify-center">
          <ImageIcon size={24} className="text-muted-foreground" />
        </div>
      )}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            {displayName(entry.className)}
          </p>
          {cost ? (
            <p className="text-sm font-mono tabular-nums text-foreground">{cost}</p>
          ) : entry.estimateError ? (
            <span className="text-[10px] text-destructive italic">Failed</span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">Panel: {panelLabel(entry.panelLocation)}</p>
        {entry.estimate && (
          <p className="text-[11px] text-muted-foreground">
            <span className="capitalize">{entry.estimate.severity}</span>
            {entry.estimate.decision && entry.estimate.decision !== "unknown" && (
              <> · <span className="capitalize">{entry.estimate.decision}</span></>
            )}
            {entry.estimate.breakdown?.repairMethod && (
              <> · {entry.estimate.breakdown.repairMethod.replace(/_/g, " ")}</>
            )}
          </p>
        )}
        {panelDefaulted && (
          <p className="text-[10px] italic text-muted-foreground/80">(panel auto-defaulted)</p>
        )}
        {entry.estimateError && !cost && (
          <p className="text-[11px] italic text-destructive">⚠ {entry.estimateError}</p>
        )}
      </div>
    </div>
  );
}
