"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useUserCars, useDamageHistory, useDetectCar, useDetectImage } from "@/hooks/use-api";
import { reportsService } from "@/services/reports.service";
import { useAuth } from "@/contexts/AuthContext";
import { ScanSearch, Download, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export default function DamageDetectionPage() {
  const { user } = useAuth();
  const { data: cars } = useUserCars();
  const userCars = Array.isArray(cars) ? cars : [];
  const [selectedCarId, setSelectedCarId] = useState<string>("");

  const carId = selectedCarId || (userCars[0]?.id as string) || "";
  const selectedCar = userCars.find((c: Record<string, unknown>) => c.id === carId);

  const { data: history, isLoading: historyLoading } = useDamageHistory(carId);
  const detectCar = useDetectCar();
  const detectImage = useDetectImage();

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
          <h3 className="font-display font-semibold text-foreground mb-4">Detection Results</h3>
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
