"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type DepthSource,
  estimateDepthMap,
  isDepthModelLoaded,
  loadDepthModel,
} from "@/lib/live-detection/depth-estimator";
import { clearOverlay, drawDepthOverlay } from "@/lib/live-detection/renderer";

interface UseDepthOverlayArgs {
  /** Video element to run depth on. */
  sourceRef: React.RefObject<DepthSource | null>;
  /** Canvas to render the depth heatmap onto. */
  depthCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Camera/detection must be active for overlay to run. */
  cameraActive: boolean;
}

interface UseDepthOverlayReturn {
  depthOverlayActive: boolean;
  depthOverlayLoading: boolean;
  depthDownloadPct: number;
  toggleDepthOverlay: () => void;
}

/**
 * Runs Depth Anything inference continuously when toggled on,
 * rendering a turbo-colormap heatmap to a dedicated overlay canvas.
 *
 * Throttled to ~5 FPS to keep the main detection loop smooth.
 */
export function useDepthOverlay({
  sourceRef,
  depthCanvasRef,
  cameraActive,
}: UseDepthOverlayArgs): UseDepthOverlayReturn {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);
  const activeRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);

  // Keep ref in sync
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Clear overlay when deactivated or camera stops
  useEffect(() => {
    if (!active || !cameraActive) {
      const canvas = depthCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) clearOverlay(ctx, canvas);
      }
    }
  }, [active, cameraActive, depthCanvasRef]);

  // Main depth render loop
  useEffect(() => {
    if (!active || !cameraActive) return;

    let cancelled = false;
    const MIN_INTERVAL_MS = 200; // ~5 FPS cap

    const loop = async () => {
      if (cancelled || !activeRef.current) return;

      const source = sourceRef.current;
      const canvas = depthCanvasRef.current;

      if (!source || !canvas || !isDepthModelLoaded()) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const isVideo = source instanceof HTMLVideoElement;
      if (isVideo && source.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      if (now - lastRunRef.current < MIN_INTERVAL_MS) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      lastRunRef.current = now;

      // Match canvas to source dimensions
      const srcW = isVideo ? source.videoWidth : source.width;
      const srcH = isVideo ? source.videoHeight : source.height;
      if (srcW && srcH) {
        if (canvas.width !== srcW) canvas.width = srcW;
        if (canvas.height !== srcH) canvas.height = srcH;
      }

      try {
        const result = await estimateDepthMap(source);
        if (cancelled || !activeRef.current) return;
        if (result) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            drawDepthOverlay(ctx, canvas, result.map, result.width, result.height);
          }
        }
      } catch (err) {
        console.warn("[useDepthOverlay] inference error:", err);
      }

      if (!cancelled && activeRef.current) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, cameraActive, sourceRef, depthCanvasRef]);

  const toggleDepthOverlay = useCallback(async () => {
    if (active) {
      setActive(false);
      return;
    }

    // Lazy-load depth model if not loaded
    if (!isDepthModelLoaded()) {
      setLoading(true);
      setDownloadPct(0);
      try {
        await loadDepthModel(undefined, setDownloadPct);
      } catch (err) {
        console.error("[useDepthOverlay] model load failed:", err);
        setLoading(false);
        setDownloadPct(0);
        return;
      }
      setLoading(false);
      setDownloadPct(0);
    }

    setActive(true);
  }, [active]);

  return {
    depthOverlayActive: active,
    depthOverlayLoading: loading,
    depthDownloadPct: downloadPct,
    toggleDepthOverlay,
  };
}
