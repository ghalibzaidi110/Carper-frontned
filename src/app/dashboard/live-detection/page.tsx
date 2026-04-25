"use client";

import { useCallback, useRef, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";
import { DEFAULT_VEHICLE, type Vehicle } from "@/lib/live-detection/vehicle";
import type { Detection } from "@/lib/live-detection/tracks";

import { CameraViewport } from "./components/CameraViewport";
import { ConfidenceSlider } from "./components/ConfidenceSlider";
import { DamageLog } from "./components/DamageLog";
import { DetectionsList } from "./components/DetectionsList";
import { EstimateDialog } from "./components/EstimateDialog";
import { ReportDialog } from "./components/ReportDialog";
import { VehicleSelect } from "./components/VehicleSelect";
import { VendorsDialog } from "./components/VendorsDialog";
import { useCamera } from "./hooks/useCamera";
import { useDamageDetector } from "./hooks/useDamageDetector";
import { type LogEntry, REPAIR_TYPES, useDamageLog } from "./hooks/useDamageLog";
import { useDetectionLoop } from "./hooks/useDetectionLoop";

export default function LiveDetectionPage() {
  const [threshold, setThreshold] = useState(0.4);
  const [vehicle, setVehicle] = useState<Vehicle>(DEFAULT_VEHICLE);
  const [openEstimate, setOpenEstimate] = useState<LogEntry | null>(null);
  const [openVendors, setOpenVendors] = useState<LogEntry | null>(null);
  const [openReport, setOpenReport] = useState(false);
  const [estimateAllLoading, setEstimateAllLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const detector = useDamageDetector();
  const camera = useCamera();
  const { detections, fps } = useDetectionLoop({
    videoRef: camera.videoRef,
    canvasRef,
    active: camera.status === "active",
    threshold,
    modelReady: detector.status === "ready",
  });
  const log = useDamageLog({ videoRef: camera.videoRef });

  const handleAddDetection = useCallback(
    (det: Detection) => log.add(det),
    [log],
  );

  const handleEstimate = useCallback(
    async (id: number) => {
      const updated = await log.runEstimate(id, vehicle);
      if (!updated) return;
      if (REPAIR_TYPES.has(updated.className)) {
        setOpenEstimate(updated);
      } else {
        setOpenVendors(updated);
      }
    },
    [log, vehicle],
  );

  const handleEstimateAll = useCallback(async () => {
    setEstimateAllLoading(true);
    try {
      await log.runEstimateAll(vehicle);
      setOpenReport(true);
    } finally {
      setEstimateAllLoading(false);
    }
  }, [log, vehicle]);

  const handleCapture = useCallback(() => {
    const video = camera.videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !video.videoWidth) return;

    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    if (canvas) ctx.drawImage(canvas, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `live-detection-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [camera.videoRef]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Live Damage Detection
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Point your camera at a vehicle to detect damage in real time. Log items to
            estimate repair cost and find replacement parts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <CameraViewport
            videoRef={camera.videoRef}
            canvasRef={canvasRef}
            cameraStatus={camera.status}
            modelStatus={detector.status}
            fps={fps}
            modelError={detector.error}
            cameraError={camera.error}
            onStart={camera.start}
            onStop={camera.stop}
            onCapture={handleCapture}
          />

          <aside className="space-y-4">
            <VehicleSelect value={vehicle} onChange={setVehicle} />
            <ConfidenceSlider value={threshold} onChange={setThreshold} />
            <DetectionsList detections={detections} onLog={handleAddDetection} />
            <DamageLog
              entries={log.entries}
              onDelete={log.remove}
              onClear={log.clear}
              onEstimate={handleEstimate}
              onEstimateAll={handleEstimateAll}
              estimateAllLoading={estimateAllLoading}
            />
          </aside>
        </div>
      </div>

      <EstimateDialog
        entry={openEstimate}
        onClose={() => setOpenEstimate(null)}
      />
      <VendorsDialog
        entry={openVendors}
        onClose={() => setOpenVendors(null)}
      />
      <ReportDialog
        open={openReport}
        entries={log.entries}
        vehicle={vehicle}
        onClose={() => setOpenReport(false)}
      />
    </DashboardLayout>
  );
}
