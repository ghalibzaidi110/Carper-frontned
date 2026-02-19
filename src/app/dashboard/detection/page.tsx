"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { DUMMY_DETECTIONS, DUMMY_CARS } from "@/data/dummy";
import { useAuth } from "@/contexts/AuthContext";
import { ScanSearch, Download, AlertTriangle, CheckCircle } from "lucide-react";

export default function DamageDetectionPage() {
  const { user } = useAuth();
  const userCars = DUMMY_CARS.filter((c) => c.userId === user?.id);
  const selectedCar = userCars[0];
  const detections = DUMMY_DETECTIONS.filter((d) => d.carId === selectedCar?.id);

  const positionColors: Record<string, string> = {
    FRONT: "bg-info/10 border-info/20",
    BACK: "bg-warning/10 border-warning/20",
    LEFT: "bg-success/10 border-success/20",
    RIGHT: "bg-destructive/10 border-destructive/20",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Damage Detection</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedCar ? `${selectedCar.manufacturer} ${selectedCar.model} ${selectedCar.year} (${selectedCar.registrationNumber})` : "Select a car"}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <ScanSearch size={16} />
              Run Detection on All
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <label className="block text-sm font-medium text-foreground mb-2">Select Vehicle</label>
          <select className="w-full max-w-sm px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {userCars.map((c) => (
              <option key={c.id} value={c.id}>{c.manufacturer} {c.model} {c.year} ({c.registrationNumber})</option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="font-display font-semibold text-foreground mb-4">Current Inspection Images</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {detections.map((det) => (
              <div key={det.id} className={`rounded-xl border p-4 ${positionColors[det.position]} transition-all hover:shadow-elevated`}>
                <div className="relative aspect-[4/3] rounded-lg bg-muted/50 mb-3 flex items-center justify-center overflow-hidden">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-medium">{det.position} VIEW</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Car image placeholder</p>
                  </div>
                  {det.hasDamage && det.boundingBox && (
                    <div
                      className="absolute border-2 border-destructive rounded bg-destructive/10"
                      style={{ left: `${det.boundingBox.x}%`, top: `${det.boundingBox.y}%`, width: `${det.boundingBox.w}%`, height: `${det.boundingBox.h}%` }}
                    >
                      <span className="absolute -top-5 left-0 text-[10px] font-semibold text-destructive bg-destructive/10 px-1 rounded">
                        {det.damageType} {det.confidence}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {det.hasDamage ? <AlertTriangle size={16} className="text-destructive" /> : <CheckCircle size={16} className="text-success" />}
                    <span className="text-sm font-medium text-foreground">{det.hasDamage ? det.damageType : "Clean"}</span>
                  </div>
                  <button className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">Detect</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Detection History</h3>
          <div className="space-y-3">
            {[
              { version: 3, date: "Feb 10, 2026", damages: 2, current: true },
              { version: 2, date: "Jan 15, 2026", damages: 0, current: false },
              { version: 1, date: "Dec 01, 2025", damages: 1, current: false },
            ].map((h) => (
              <div key={h.version} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${h.current ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Version {h.version} {h.current && <span className="text-xs text-primary">(Current)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{h.date}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${h.damages > 0 ? "text-destructive" : "text-success"}`}>
                  {h.damages} damage{h.damages !== 1 ? "s" : ""} found
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
