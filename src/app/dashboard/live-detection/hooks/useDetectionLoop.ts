"use client";

import { useEffect, useRef, useState } from "react";

import { detectDamage, isDamageModelLoaded } from "@/lib/live-detection/detector";
import { drawDetections, clearOverlay } from "@/lib/live-detection/renderer";
import { MIN_HITS, updateTracks } from "@/lib/live-detection/tracks";
import type { Detection, Track } from "@/lib/live-detection/tracks";

interface UseDetectionLoopArgs {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  active: boolean;
  threshold: number;
  modelReady: boolean;
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
  videoRef,
  canvasRef,
  active,
  threshold,
  modelReady,
}: UseDetectionLoopArgs): UseDetectionLoopReturn {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);

  const tracksRef = useRef<Track[]>([]);
  const fpsTimesRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const thresholdRef = useRef(threshold);

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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      // Match canvas to video size (only when changed to avoid layout thrash)
      if (video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      }

      try {
        if (!isDamageModelLoaded() || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const dets = await detectDamage(video, thresholdRef.current);
        if (cancelled) return;

        const now = performance.now();
        tracksRef.current = updateTracks(tracksRef.current, dets, now);

        const visible = tracksRef.current
          .filter((t) => t.hits >= MIN_HITS)
          .sort((a, b) => a.className.localeCompare(b.className))
          .slice(0, 25);

        const ctx = canvas.getContext("2d");
        if (ctx) drawDetections(ctx, canvas, video, visible);

        setDetections(visible.map((t) => ({ ...t, bbox: t.smoothBbox })));

        // FPS — sliding 1000ms window
        const times = fpsTimesRef.current;
        times.push(now);
        while (times.length > 0 && now - times[0] > 1000) times.shift();
        setFps(times.length);
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
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) clearOverlay(ctx, canvasRef.current);
      }
      setDetections([]);
      setFps(0);
    };
  }, [active, modelReady, videoRef, canvasRef]);

  return { detections, fps };
}
