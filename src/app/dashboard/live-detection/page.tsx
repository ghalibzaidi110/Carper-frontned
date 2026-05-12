"use client";

import { ShieldAlert, View, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_VEHICLE, type Vehicle } from "@/lib/live-detection/vehicle";
import type { Detection } from "@/lib/live-detection/tracks";

import { CameraViewport } from "./components/CameraViewport";
import { DamageLog } from "./components/DamageLog";
import { DetectionsList } from "./components/DetectionsList";
import { EstimateDialog } from "./components/EstimateDialog";
import { ReportDialog } from "./components/ReportDialog";
import { SaveScanToast } from "./components/SaveScanToast";
import { VehicleSelect } from "./components/VehicleSelect";
import { VendorsDialog } from "./components/VendorsDialog";
import { useCamera } from "./hooks/useCamera";
import { useDamageDetector } from "./hooks/useDamageDetector";
import { useDepthEstimator } from "./hooks/useDepthEstimator";
import {
  type LogEntry,
  REPAIR_TYPES,
  useDamageLog,
} from "./hooks/useDamageLog";
import { useDepthOverlay } from "./hooks/useDepthOverlay";
import { useDetectionLoop } from "./hooks/useDetectionLoop";
import { useSaveScan } from "./hooks/useSaveScan";
import { useSecureContext } from "./hooks/useSecureContext";
import { useWebXRDepth } from "./hooks/useWebXRDepth";

const DETECTION_THRESHOLD = 0.4;

export default function LiveDetectionPage() {
  const [vehicle, setVehicle] = useState<Vehicle>(DEFAULT_VEHICLE);
  const [openEstimate, setOpenEstimate] = useState<LogEntry | null>(null);
  const [openVendors, setOpenVendors] = useState<LogEntry | null>(null);
  const [openReport, setOpenReport] = useState(false);
  const [estimateAllLoading, setEstimateAllLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const xrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const depthCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const secureContext = useSecureContext();
  const detector = useDamageDetector();
  const camera = useCamera();
  const depth = useDepthEstimator();
  const xr = useWebXRDepth();

  // Detection source: XR canvas when AR active, video otherwise
  const sourceRef = xr.xrStatus === "active" ? xrCanvasRef : camera.videoRef;

  const xrActive = xr.xrStatus === "active";

  // Depth overlay uses Depth-Anything (50 MB model). In AR mode the device
  // already provides native depth via WebXR — running both simultaneously
  // causes main-thread contention and visible frame drops.
  const depthOverlay = useDepthOverlay({
    sourceRef,
    depthCanvasRef,
    cameraActive: !xrActive && camera.status === "active",
  });

  const { detections, fps } = useDetectionLoop({
    sourceRef,
    canvasRef,
    active: xrActive || camera.status === "active",
    threshold: DETECTION_THRESHOLD,
    modelReady: detector.status === "ready",
    // AR mode: throttle YOLO to ~5 FPS. The XR frame loop runs at device
    // refresh rate; running WASM inference every frame blocks it completely.
    minIntervalMs: xrActive ? 200 : 0,
  });
  const log = useDamageLog({
    videoRef: camera.videoRef,
    xrCanvasRef,
    estimateDepth: depth.estimateDepth,
    xrActive: xr.xrStatus === "active",
    measureDamageXR: xr.measureDamageXR,
  });

  const handleAddDetection = useCallback(
    (det: Detection) => log.add(det),
    [log],
  );

  const handleEstimate = useCallback(
    async (id: number) => {
      const updated = await log.runEstimate(id, vehicle);
      if (!updated) return;
      // Skip dialog when the estimator was blocked (e.g. panel not yet
      // identified) or the API failed — the inline error in DamageLog
      // already surfaces the reason.
      if (updated.estimateError) return;
      if (REPAIR_TYPES.has(updated.className) && updated.estimate) {
        setOpenEstimate(updated);
      } else if (updated.vendors) {
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

  // Save-scan state lives at page level so closing the Report Dialog
  // mid-save still tracks progress in the floating toast.
  const saveScan = useSaveScan();
  const handleSaveScan = useCallback(() => {
    void saveScan.save(log.entries, vehicle);
  }, [saveScan, log.entries, vehicle]);

  const handleStartCamera = useCallback(() => {
    if (!secureContext.ok) return; // banner already explains why
    void camera.start();
  }, [secureContext.ok, camera]);

  const handleStartAR = useCallback(async () => {
    if (!xrCanvasRef.current) return;
    // Stop regular camera before starting XR — they can't share the device
    camera.stop();
    await xr.startAR(xrCanvasRef.current);
  }, [camera, xr]);

  const handleStopAR = useCallback(() => {
    xr.stopAR();
    // Restart regular camera after exiting AR
    void camera.start();
  }, [xr, camera]);

  // F-2: pause the camera when the tab goes hidden so the phone doesn't
  // burn battery + cellular data decoding video the user can't see. The
  // user re-clicks Start when they return — explicit by design (we don't
  // want to silently re-grant camera permission on tab focus).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && camera.status === "active") {
        camera.stop();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [camera]);

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
    <>
      {/* ── Fullscreen AR controls overlay ───────────────────────────────────
          The XR canvas and bbox canvas go fixed/fullscreen via CSS inside
          CameraViewport (z-40, z-41). This overlay (z-50) floats controls
          on top so the user can tap detections and exit AR.              */}
      {xrActive && (
        <div className="fixed inset-0 z-50 flex flex-col pointer-events-none">
          {/* Top bar */}
          <div className="flex items-center justify-between p-3 bg-black/50 backdrop-blur-sm pointer-events-auto">
            <span className="flex items-center gap-2 text-white text-sm font-semibold">
              <View size={16} className="text-emerald-400" />
              AR Depth Mode
            </span>
            <button
              type="button"
              onClick={handleStopAR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
            >
              <X size={14} />
              Exit AR
            </button>
          </div>
          {/* Centre clear — lets the user see the AR camera view */}
          <div className="flex-1" />
          {/* Bottom tray — full detection + log flow, same as camera mode */}
          <div className="p-3 bg-black/50 backdrop-blur-sm pointer-events-auto space-y-2 max-h-[55vh] overflow-y-auto">
            <DetectionsList
              detections={detections}
              onLog={handleAddDetection}
            />
            <DamageLog
              entries={log.entries}
              onDelete={log.remove}
              onClear={log.clear}
              onEstimate={handleEstimate}
              onEstimateAll={handleEstimateAll}
              onSetPanel={log.setPanelLocation}
              estimateAllLoading={estimateAllLoading}
            />
          </div>
        </div>
      )}

      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Live Damage Detection
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Point your camera at a vehicle to detect damage in real time. Log
            items to estimate repair cost and find replacement parts.
          </p>
        </div>

        {!secureContext.ok && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
            <ShieldAlert
              size={20}
              className="text-amber-700 dark:text-amber-400 mt-0.5 shrink-0"
            />
            <div className="text-sm">
              <p className="font-semibold text-foreground">HTTPS required</p>
              <p className="text-muted-foreground mt-1">
                {secureContext.reason}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <CameraViewport
            videoRef={camera.videoRef}
            canvasRef={canvasRef}
            xrCanvasRef={xrCanvasRef}
            depthCanvasRef={depthCanvasRef}
            cameraStatus={camera.status}
            modelStatus={detector.status}
            fps={fps}
            modelError={detector.error}
            cameraError={camera.error}
            onStart={handleStartCamera}
            onStop={camera.stop}
            onCapture={handleCapture}
            xrAvailable={xr.xrAvailable}
            xrStatus={xr.xrStatus}
            xrError={xr.xrError}
            onStartAR={handleStartAR}
            onStopAR={handleStopAR}
            depthOverlayActive={depthOverlay.depthOverlayActive}
            depthOverlayLoading={depthOverlay.depthOverlayLoading}
            depthDownloadPct={depthOverlay.depthDownloadPct}
            onToggleDepth={depthOverlay.toggleDepthOverlay}
          />

          <aside className="space-y-4">
            <VehicleSelect value={vehicle} onChange={setVehicle} />
            <DetectionsList
              detections={detections}
              onLog={handleAddDetection}
            />
            <DamageLog
              entries={log.entries}
              onDelete={log.remove}
              onClear={log.clear}
              onEstimate={handleEstimate}
              onEstimateAll={handleEstimateAll}
              onSetPanel={log.setPanelLocation}
              estimateAllLoading={estimateAllLoading}
            />
          </aside>
        </div>
      </div>

      <EstimateDialog
        entry={openEstimate}
        onClose={() => setOpenEstimate(null)}
      />
      <VendorsDialog entry={openVendors} onClose={() => setOpenVendors(null)} />
      <ReportDialog
        open={openReport}
        entries={log.entries}
        vehicle={vehicle}
        onClose={() => setOpenReport(false)}
        saveState={saveScan.state}
        onSaveScan={handleSaveScan}
      />

      <SaveScanToast
        state={saveScan.state}
        onDismiss={saveScan.reset}
        onRetry={handleSaveScan}
      />
    </>
  );
}
