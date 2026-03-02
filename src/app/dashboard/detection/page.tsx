"use client";

import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUserCars, useDamageHistory, useDetectCar, useDetectImage, useDamageScan } from "@/hooks/use-api";
import { reportsService } from "@/services/reports.service";
import { useAuth } from "@/contexts/AuthContext";
import type { DamageScanResponse } from "@/services/damage-detection.service";
import { ScanSearch, Download, AlertTriangle, CheckCircle, Loader2, Upload, X } from "lucide-react";

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
              {selectedCar
                ? `${(selectedCar.manufacturer || (selectedCar.catalogCar as Record<string, unknown>)?.manufacturer) as string} ${(selectedCar.model || (selectedCar.catalogCar as Record<string, unknown>)?.modelName) as string} (${selectedCar.registrationNumber as string})`
                : "Select a car"}
            </p>
          </div>
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
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <h4 className="font-semibold text-foreground">Scan results</h4>
                {scanResult.summary.isDemoMode && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
                    Demo mode
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {scanResult.summary.imagesWithDamage} of {scanResult.summary.totalImages} with damage
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scanResult.results.map((r, i) => (
                  <div key={i} className="rounded-xl border border-border overflow-hidden bg-muted/30">
                    <div className="aspect-video relative">
                      <img
                        src={r.processedImageUrl}
                        alt={`Result ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${r.hasDamage ? "bg-destructive/90 text-destructive-foreground" : "bg-success/90 text-success-foreground"}`}>
                          {r.hasDamage ? "Damage" : "Clean"}
                        </span>
                        {r.confidence > 0 && (
                          <span className="text-xs text-foreground/90 bg-black/50 px-2 py-0.5 rounded">
                            {(r.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 text-xs text-muted-foreground">
                      Severity: {r.severity || "NONE"}
                      {r.detections?.length > 0 && ` · ${r.detections.length} detection(s)`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
      </div>
    </DashboardLayout>
  );
}
