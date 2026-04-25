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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URLs for thumbnails — recompute when files change, revoke on cleanup
  const previews = useMemo(
    () => quickScanFiles.map((f) => URL.createObjectURL(f)),
    [quickScanFiles],
  );
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  const carId = selectedCarId || (userCars[0]?.id as string) || "";
  const selectedCar = userCars.find((c: Record<string, unknown>) => c.id === carId);

  const { data: history, isLoading: historyLoading } = useDamageHistory(carId);
  const detectCar = useDetectCar();
  const detectImage = useDetectImage();
  const damageScan = useDamageScan();

  const acceptFiles = (chosen: File[]) => {
    const valid = chosen.filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_SIZE_MB * 1024 * 1024,
    );
    setQuickScanFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
  };

  const handleQuickScanFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFiles(Array.from(e.dataTransfer.files));
  };

  const removeQuickScanFile = (index: number) => {
    setQuickScanFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-foreground text-lg flex items-center gap-2">
                <ImageIcon size={18} className="text-primary" />
                Quick Scan
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload up to {MAX_FILES} images and let our AI inspect them for damage.
              </p>
            </div>
            {quickScanFiles.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium tabular-nums">
                {quickScanFiles.length} / {MAX_FILES}
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleQuickScanFiles}
            className="hidden"
          />

          {quickScanFiles.length === 0 ? (
            // Empty state — large dropzone
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`group cursor-pointer rounded-xl border-2 border-dashed py-14 px-6 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${
                isDragging ? "bg-primary/15" : "bg-primary/10 group-hover:bg-primary/15"
              }`}>
                <Upload size={26} className="text-primary" />
              </div>
              <p className="font-medium text-foreground">
                {isDragging ? (
                  "Drop your images to upload"
                ) : (
                  <>Drop images here, or <span className="text-primary underline-offset-2 group-hover:underline">click to browse</span></>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG, or WEBP &middot; up to {MAX_SIZE_MB} MB each &middot; max {MAX_FILES} images
              </p>
            </div>
          ) : (
            <>
              {/* Thumbnail grid + drop target for adding more */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3 rounded-xl border-2 border-dashed transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-border/70"
                }`}
              >
                {quickScanFiles.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 aspect-square shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previews[i]}
                      alt={f.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeQuickScanFile(i)}
                      aria-label={`Remove ${f.name}`}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <p className="text-[11px] text-white font-medium truncate" title={f.name}>
                        {f.name}
                      </p>
                      <p className="text-[10px] text-white/70 tabular-nums">{formatBytes(f.size)}</p>
                    </div>
                  </div>
                ))}

                {quickScanFiles.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <Plus size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                      Add more
                    </span>
                  </button>
                )}
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
                <span className="text-sm text-muted-foreground">
                  {quickScanFiles.length} {quickScanFiles.length === 1 ? "image" : "images"} ready &middot;{" "}
                  <span className="tabular-nums">
                    {formatBytes(quickScanFiles.reduce((s, f) => s + f.size, 0))}
                  </span>{" "}
                  total
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setQuickScanFiles([]); setScanResult(null); }}
                    disabled={damageScan.isPending}
                    className="text-sm px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={runQuickScan}
                    disabled={damageScan.isPending}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {damageScan.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Scanning…
                      </>
                    ) : (
                      <>
                        <ScanSearch size={16} />
                        Run scan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
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
