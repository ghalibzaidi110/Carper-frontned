"use client";

import { useEffect, useRef, useState } from "react";

import { detectDamage, isDamageModelLoaded } from "@/lib/live-detection/detector";
import { drawDetections, clearOverlay } from "@/lib/live-detection/renderer";
import { MIN_HITS, updateTracks } from "@/lib/live-detection/tracks";
import type { Detection, Track } from "@/lib/live-detection/tracks";

/** Detection source — video for normal mode, canvas for WebXR AR mode. */
type SourceElement = HTMLVideoElement | HTMLCanvasElement;

interface UseDetectionLoopArgs {
  /** Primary detection source (video or XR canvas). */
  sourceRef: React.RefObject<SourceElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  active: boolean;
  threshold: number;
  modelReady: boolean;
  /** Throttle inference to at most once per this many ms (default: no throttle). */
  minIntervalMs?: number;
}

interface UseDetectionLoopReturn {
  detections: Detection[];
  fps: number;
}

/**
 * The main per-frame inference loop. Runs YOLO detection on the video,
 * applies an IoU tracker for stability, draws bboxes on the overlay canvas,
 * and exposes the current visible detections + an FPS readout.
 */
export function useDetectionLoop({
  sourceRef,
  canvasRef,
  active,
  threshold,
  modelReady,
  minIntervalMs = 0,
}: UseDetectionLoopArgs): UseDetectionLoopReturn {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);

  const tracksRef = useRef<Track[]>([]);
  const fpsTimesRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const thresholdRef = useRef(threshold);
  const lastInferRef = useRef(0);
  const lastFpsUpdateRef = useRef(0);

  // Keep threshold ref in sync without restarting the loop
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  useEffect(() => {
    if (!active || !modelReady) {
      // Clear canvas when stopping
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) clearOverlay(ctx, canvasRef.current);
      }
      return;
    }

    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;
      const source = sourceRef.current;
      const canvas = canvasRef.current;
      if (!source || !canvas) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Source dimensions — video uses videoWidth/videoHeight, canvas uses width/height
      const isVideo = source instanceof HTMLVideoElement;
      const srcW = isVideo ? source.videoWidth : source.width;
      const srcH = isVideo ? source.videoHeight : source.height;

      // Match overlay canvas to source size (only when changed to avoid layout thrash)
      if (srcW && srcH) {
        if (canvas.width !== srcW) canvas.width = srcW;
        if (canvas.height !== srcH) canvas.height = srcH;
      }

      try {
        if (!isDamageModelLoaded() || (isVideo && source.readyState < 2)) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const now = performance.now();

        // Throttle inference when minIntervalMs is set (e.g. AR mode)
        if (minIntervalMs > 0 && now - lastInferRef.current < minIntervalMs) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastInferRef.current = now;

        const dets = await detectDamage(source, thresholdRef.current);
        if (cancelled) return;

        tracksRef.current = updateTracks(tracksRef.current, dets, now);

        const visible = tracksRef.current
          .filter((t) => t.hits >= MIN_HITS)
          .sort((a, b) => a.className.localeCompare(b.className))
          .slice(0, 25);

        const ctx = canvas.getContext("2d");
        // drawDetections expects HTMLVideoElement for sizing — when source is
        // canvas (XR mode), create a minimal shim with matching dimensions.
        if (ctx) {
          if (isVideo) {
            drawDetections(ctx, canvas, source, visible);
          } else {
            // XR canvas mode: drawDetections uses videoWidth/videoHeight for
            // coordinate mapping. Create a duck-typed shim.
            const shim = { videoWidth: srcW, videoHeight: srcH } as HTMLVideoElement;
            drawDetections(ctx, canvas, shim, visible);
          }
        }

        setDetections(visible.map((t) => ({ ...t, bbox: t.smoothBbox })));

        // FPS — sliding 1000ms window, update state at most every 500ms
        const times = fpsTimesRef.current;
        times.push(now);
        while (times.length > 0 && now - times[0] > 1000) times.shift();
        if (now - lastFpsUpdateRef.current >= 500) {
          lastFpsUpdateRef.current = now;
          setFps(times.length);
        }
      } catch (err) {
        // Keep the loop alive on transient errors
        console.error("[useDetectionLoop] error:", err);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      tracksRef.current = [];
      fpsTimesRef.current = [];
      lastInferRef.current = 0;
      lastFpsUpdateRef.current = 0;
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) clearOverlay(ctx, canvasRef.current);
      }
      setDetections([]);
      setFps(0);
    };
  }, [active, modelReady, sourceRef, canvasRef, minIntervalMs]);

  return { detections, fps };
}
