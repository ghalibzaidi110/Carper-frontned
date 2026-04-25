"use client";

import { Camera, CircleDot, Loader2, Play, Square } from "lucide-react";

import type { CameraStatus } from "../hooks/useCamera";
import type { ModelStatus } from "../hooks/useDamageDetector";

interface CameraViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraStatus: CameraStatus;
  modelStatus: ModelStatus;
  fps: number;
  modelError: string | null;
  cameraError: string | null;
  onStart: () => void;
  onStop: () => void;
  onCapture: () => void;
}

export function CameraViewport({
  videoRef,
  canvasRef,
  cameraStatus,
  modelStatus,
  fps,
  modelError,
  cameraError,
  onStart,
  onStop,
  onCapture,
}: CameraViewportProps) {
  const isActive = cameraStatus === "active";
  const isStarting = cameraStatus === "starting";
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
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-contain"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
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
      </div>
    </div>
  );
}
