"use client";

import { Camera, CircleDot, Layers, Loader2, Play, Square, View } from "lucide-react";

import type { CameraStatus } from "../hooks/useCamera";
import type { ModelStatus } from "../hooks/useDamageDetector";
import type { XRStatus } from "../hooks/useWebXRDepth";

interface CameraViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  xrCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  depthCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraStatus: CameraStatus;
  modelStatus: ModelStatus;
  fps: number;
  modelError: string | null;
  cameraError: string | null;
  onStart: () => void;
  onStop: () => void;
  onCapture: () => void;
  xrAvailable: boolean;
  xrStatus: XRStatus;
  xrError: string | null;
  onStartAR: () => void;
  onStopAR: () => void;
  depthOverlayActive: boolean;
  depthOverlayLoading: boolean;
  depthDownloadPct: number;
  onToggleDepth: () => void;
}

export function CameraViewport({
  videoRef,
  canvasRef,
  xrCanvasRef,
  depthCanvasRef,
  cameraStatus,
  modelStatus,
  fps,
  modelError,
  cameraError,
  onStart,
  onStop,
  onCapture,
  xrAvailable,
  xrStatus,
  xrError,
  onStartAR,
  onStopAR,
  depthOverlayActive,
  depthOverlayLoading,
  depthDownloadPct,
  onToggleDepth,
}: CameraViewportProps) {
  const xrActive = xrStatus === "active";
  const isActive = cameraStatus === "active" || xrActive;
  const isStarting = cameraStatus === "starting" || xrStatus === "starting";
  const modelLoading = modelStatus === "loading";
  const modelReady = modelStatus === "ready";

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isActive
                  ? "bg-green-500 animate-pulse"
                  : isStarting
                    ? "bg-amber-500 animate-pulse"
                    : "bg-muted-foreground/40"
              }`}
            />
            <span className="text-muted-foreground capitalize">{cameraStatus}</span>
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                modelReady
                  ? "bg-blue-500"
                  : modelLoading
                    ? "bg-amber-500 animate-pulse"
                    : "bg-muted-foreground/40"
              }`}
            />
            <span className="text-muted-foreground">
              {modelLoading
                ? "Loading model…"
                : modelReady
                  ? "Model ready"
                  : modelStatus === "error"
                    ? "Model error"
                    : "Model idle"}
            </span>
          </span>
        </div>
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {isActive ? `${fps} FPS` : "—"}
        </span>
      </div>

      {/* Video + overlay */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-contain ${xrActive ? "hidden" : ""}`}
        />
        {/* XR canvas — always in DOM so the WebGL context (and XR session
            binding) stays stable. When AR is active we fix it to the
            viewport so it actually fills the screen; `fixed` children
            escape the parent's overflow-hidden. When inactive it is
            hidden so it doesn't occlude the video feed. */}
        <canvas
          ref={xrCanvasRef as React.RefObject<HTMLCanvasElement>}
          className={
            xrActive
              ? "fixed inset-0 z-40 w-full h-full"
              : "absolute inset-0 w-full h-full hidden"
          }
        />
        {/* Depth heatmap overlay — below detection boxes so bboxes stay visible */}
        <canvas
          ref={depthCanvasRef as React.RefObject<HTMLCanvasElement>}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${depthOverlayActive ? "" : "hidden"}`}
        />
        {/* Detection bbox overlay — also goes fullscreen during AR so bboxes
            are drawn over the XR passthrough view. z-41 sits above XR canvas
            (z-40) but below the controls overlay (z-50). */}
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          className={
            xrActive
              ? "fixed inset-0 z-[41] w-full h-full pointer-events-none"
              : "absolute inset-0 w-full h-full object-contain pointer-events-none"
          }
        />
        {/* Depth overlay badge */}
        {depthOverlayActive && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-violet-500/80 text-white text-xs font-semibold flex items-center gap-1">
            <Layers size={12} />
            Depth View
          </div>
        )}
        {/* AR active — viewport shows camera feed placeholder; real AR view is
            the fullscreen overlay rendered by the page. */}
        {xrActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white/70 text-sm">AR session active</p>
          </div>
        )}
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <Camera size={48} className="text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {cameraStatus === "error"
                  ? `Camera error: ${cameraError ?? "unknown"}`
                  : modelStatus === "error"
                    ? `Model error: ${modelError ?? "unknown"}`
                    : modelLoading
                      ? "Loading damage detection model…"
                      : "Click Start to begin live damage detection"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-t border-border">
        {!isActive ? (
          <button
            type="button"
            onClick={onStart}
            disabled={!modelReady || isStarting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStarting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            {isStarting ? "Starting…" : "Start"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
          >
            <Square size={16} />
            Stop
          </button>
        )}
        <button
          type="button"
          onClick={onCapture}
          disabled={!isActive}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          <CircleDot size={16} />
          Capture frame
        </button>
        {isActive && (
          <button
            type="button"
            onClick={onToggleDepth}
            disabled={depthOverlayLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              depthOverlayActive
                ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                : "border-border text-foreground hover:bg-muted"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {depthOverlayLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Layers size={16} />
            )}
            {depthOverlayLoading
              ? depthDownloadPct > 0
                ? `${depthDownloadPct}%`
                : "Loading…"
              : depthOverlayActive
                ? "Hide Depth"
                : "Depth View"}
          </button>
        )}
        {xrAvailable && (
          xrActive ? (
            <button
              type="button"
              onClick={onStopAR}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors ml-auto"
            >
              <View size={16} />
              Exit AR
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartAR}
              disabled={!modelReady || isStarting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/50 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
            >
              {xrStatus === "starting" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <View size={16} />
              )}
              AR Measure
            </button>
          )
        )}
        {xrError && (
          <span className="text-xs text-destructive">{xrError}</span>
        )}
      </div>
    </div>
  );
}
