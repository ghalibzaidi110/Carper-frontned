"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUserCars, useDamageHistory, useDetectCar, useDetectImage, useDamageScan } from "@/hooks/use-api";
import { reportsService } from "@/services/reports.service";
import { useAuth } from "@/contexts/AuthContext";
import type { DamageScanResponse } from "@/services/damage-detection.service";
import { ScanSearch, Download, AlertTriangle, CheckCircle, Loader2, Upload, X, Plus, ImageIcon } from "lucide-react";

const MAX_FILES = 10;
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function DamageDetectionPage() {
  const { user } = useAuth();
  const { data: cars } = useUserCars();
  const userCars = Array.isArray(cars) ? cars : [];
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [quickScanFiles, setQuickScanFiles] = useState<File[]>([]);
  const [scanResult, setScanResult] = useState<DamageScanResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const carId = selectedCarId || (userCars[0]?.id as string) || "";
  const selectedCar = userCars.find((c: Record<string, unknown>) => c.id === carId);

  const { data: history, isLoading: historyLoading } = useDamageHistory(carId);
  const detectCar = useDetectCar();
  const detectImage = useDetectImage();
  const damageScan = useDamageScan();

  const handleQuickScanFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const file of chosen) {
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) continue;
      valid.push(file);
    }
    setQuickScanFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeQuickScanFile = (index: number) => {
    setQuickScanFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const runQuickScan = () => {
    setScanResult(null);
    if (quickScanFiles.length === 0) return;
    damageScan.mutate(
      quickScanFiles.length === 1 ? quickScanFiles[0] : quickScanFiles,
      {
        onSuccess: (data) => setScanResult(data),
      }
    );
  };

  const handleRunDetection = () => {
    if (carId) detectCar.mutate(carId);
  };

  const handleDownloadPdf = async () => {
    if (carId) {
      try {
        await reportsService.downloadDamageReport(carId);
      } catch {
        /* toast already handled */
      }
    }
  };

  const positions = ["FRONT", "BACK", "LEFT", "RIGHT"];
  const positionColors: Record<string, string> = {
    FRONT: "bg-info/10 border-info/20",
    BACK: "bg-warning/10 border-warning/20",
    LEFT: "bg-success/10 border-success/20",
    RIGHT: "bg-destructive/10 border-destructive/20",
  };

  // Extract latest results from history
  const latestResults = Array.isArray(history) ? history : [];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Damage Detection</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload car image(s) below to scan for damage.
            </p>
          </div>
          {/* TEMP: hidden — registered-car flow not in use yet
          <div className="flex gap-3">
            <button
              onClick={handleRunDetection}
              disabled={!carId || detectCar.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {detectCar.isPending ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />}
              Run Detection on All
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!carId}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
          */}
        </div>

        {/* Quick Scan: upload images (no car required) */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-1">Quick Scan</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload 1–10 images (JPG, PNG, WEBP, max 10MB each) to run damage detection without linking to a car.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleQuickScanFiles}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              <Upload size={16} />
              Choose images
            </button>
            {quickScanFiles.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {quickScanFiles.length} file(s) selected
                </span>
                <button
                  type="button"
                  onClick={runQuickScan}
                  disabled={damageScan.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {damageScan.isPending ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />}
                  {damageScan.isPending ? "Scanning..." : "Run scan"}
                </button>
                <button
                  type="button"
                  onClick={() => { setQuickScanFiles([]); setScanResult(null); }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </>
            )}
          </div>
          {quickScanFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {quickScanFiles.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs text-foreground"
                >
                  {f.name}
                  <button type="button" onClick={() => removeQuickScanFile(i)} className="p-0.5 hover:bg-muted-foreground/20 rounded">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {scanResult && (
            <div className="mt-6 pt-6 border-t border-border space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="font-semibold text-foreground text-base">Scan Report</h4>
                {scanResult.summary.isDemoMode && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
                    Demo mode (Python service unavailable)
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {scanResult.summary.imagesWithDamage} of {scanResult.summary.totalImages} image(s) flagged with damage
                </span>
              </div>

              {scanResult.results.map((r, i) => {
                const sev = (r.severity || "NONE").toUpperCase();
                const sevClass: Record<string, string> = {
                  NONE: "bg-success/15 text-success border-success/30",
                  MINOR: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                  MODERATE: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
                  SEVERE: "bg-destructive/15 text-destructive border-destructive/30",
                };
                const confPct = Math.round((r.confidence ?? 0) * 100);
                const dets = r.detections ?? [];
                return (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Header: status + severity + confidence */}
                    <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {r.hasDamage ? (
                          <AlertTriangle size={18} className="text-destructive" />
                        ) : (
                          <CheckCircle size={18} className="text-success" />
                        )}
                        <span className="font-semibold text-foreground">
                          Image {i + 1}: {r.hasDamage ? "Damage Detected" : "No Damage"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${sevClass[sev] ?? sevClass.NONE}`}>
                          {sev}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Confidence</span>
                        <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${r.hasDamage ? "bg-destructive" : "bg-success"}`}
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground tabular-nums w-10 text-right">{confPct}%</span>
                        <a
                          href={r.processedImageUrl}
                          download={`scan-${i + 1}.jpg`}
                          className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors"
                          title="Download annotated image"
                        >
                          <Download size={12} />
                          Save
                        </a>
                      </div>
                    </div>

                    {/* Body: original vs annotated */}
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="relative">
                        <span className="absolute top-2 left-2 z-10 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 text-white">
                          Original
                        </span>
                        <img
                          src={r.originalImageUrl}
                          alt={`Original ${i + 1}`}
                          className="w-full h-72 md:h-80 object-contain bg-muted/40"
                        />
                      </div>
                      <div className="relative border-l border-border">
                        <span className="absolute top-2 left-2 z-10 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 text-white">
                          Annotated
                        </span>
                        <img
                          src={r.processedImageUrl}
                          alt={`Annotated ${i + 1}`}
                          className="w-full h-72 md:h-80 object-contain bg-muted/40"
                        />
                      </div>
                    </div>

                    {/* Detections table */}
                    <div className="px-4 py-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-semibold text-foreground">
                          Detections ({dets.length})
                        </h5>
                      </div>
                      {dets.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No damage regions detected by the model.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-muted-foreground border-b border-border">
                                <th className="py-2 pr-4 font-medium">#</th>
                                <th className="py-2 pr-4 font-medium">Label</th>
                                <th className="py-2 pr-4 font-medium">Confidence</th>
                                <th className="py-2 pr-4 font-medium">BBox (x1, y1, x2, y2)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dets.map((d, j) => {
                                const dConf = Math.round(((d.confidence ?? 0) as number) * 100);
                                const bbox = (d.bbox ?? []) as number[];
                                return (
                                  <tr key={j} className="border-b border-border/50 last:border-0">
                                    <td className="py-2 pr-4 text-muted-foreground tabular-nums">{j + 1}</td>
                                    <td className="py-2 pr-4 font-medium text-foreground">{d.label || "—"}</td>
                                    <td className="py-2 pr-4 tabular-nums">
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                          <div className="h-full bg-primary" style={{ width: `${dConf}%` }} />
                                        </div>
                                        <span>{dConf}%</span>
                                      </div>
                                    </td>
                                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground tabular-nums">
                                      {bbox.length === 4
                                        ? `[${bbox.map((n) => n.toFixed(0)).join(", ")}]`
                                        : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TEMP: hidden — registered-car flow not in use yet.
            Uncomment this block (and the Run Detection / Download PDF buttons above)
            to bring back: vehicle selector, per-position results grid, and detection history.

        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <label className="block text-sm font-medium text-foreground mb-2">Select Vehicle</label>
          <select
            value={carId}
            onChange={(e) => setSelectedCarId(e.target.value)}
            className="w-full max-w-sm px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {userCars.map((c: Record<string, unknown>) => (
              <option key={c.id as string} value={c.id as string}>
                {(c.manufacturer || (c.catalogCar as Record<string, unknown>)?.manufacturer) as string}{" "}
                {(c.model || (c.catalogCar as Record<string, unknown>)?.modelName) as string}{" "}
                ({c.registrationNumber as string})
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="font-display font-semibold text-foreground mb-4">Detection Results (by car)</h3>
          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {positions.map((pos) => {
                const det = latestResults.find?.((d: Record<string, unknown>) =>
                  ((d.category as string) || "").toUpperCase().includes(pos)
                );
                const hasDamage = det?.hasDamage;
                return (
                  <div key={pos} className={`rounded-xl border p-4 ${positionColors[pos]} transition-all hover:shadow-elevated`}>
                    <div className="relative aspect-[4/3] rounded-lg bg-muted/50 mb-3 flex items-center justify-center overflow-hidden">
                      {det?.processedImageUrl || det?.imageUrl ? (
                        <img src={(det.processedImageUrl || det.imageUrl) as string} alt={pos} className="object-cover w-full h-full rounded-lg" />
                      ) : (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground font-medium">{pos} VIEW</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">No image</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {hasDamage ? <AlertTriangle size={16} className="text-destructive" /> : <CheckCircle size={16} className="text-success" />}
                        <span className="text-sm font-medium text-foreground">
                          {hasDamage ? "Damage Found" : "Clean"}
                        </span>
                      </div>
                      <button
                        onClick={() => det?.imageId && detectImage.mutate(det.imageId as string)}
                        className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                      >
                        Detect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Detection History</h3>
          <div className="space-y-3">
            {(!latestResults || latestResults.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No detection history yet. Run a detection to get started.</p>
            )}
          </div>
        </div>
        */}
      </div>
    </DashboardLayout>
  );
}
