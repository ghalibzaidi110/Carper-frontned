"use client";

import { useEffect, useRef, useState } from "react";

import { pruneOldCaptures } from "@/lib/live-detection/capture-store";
import { releaseDepthModel } from "@/lib/live-detection/depth-estimator";
import { loadDamageModel, releaseDamageModel } from "@/lib/live-detection/detector";
import { preloadPartModel, releasePartModel } from "@/lib/live-detection/part-segmenter";
import { diffAgainstCanonical } from "@/lib/live-detection/vehicle";
import { liveDetectionService } from "@/services/live-detection.service";

export type ModelStatus = "idle" | "loading" | "ready" | "error";

interface UseDamageDetector {
  status: ModelStatus;
  error: string | null;
}

/**
 * Loads the YOLOv8 damage model on mount and preloads the parts model in
 * the background. Both are cached to IndexedDB-backed Cache API after the
 * first download, so subsequent visits are instant.
 */
export function useDamageDetector(): UseDamageDetector {
  const [status, setStatus] = useState<ModelStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // guard against React Strict Mode double-mount
    startedRef.current = true;

    let cancelled = false;
    (async () => {
      setStatus("loading");
      // F-4: clear out IndexedDB captures older than 30 days. Fire-and-
      // forget — failures don't block the page (a full disk shouldn't
      // either, since saveCapture() handles its own errors).
      void pruneOldCaptures(30).catch(() => {});

      // F-5: in dev, check the hardcoded vehicle dropdown against the
      // cost model's canonical vehicle list and warn on drift. Silently
      // skips in production (the warning is for developers, not users).
      if (process.env.NODE_ENV !== "production") {
        void liveDetectionService
          .knownVehicles()
          .then((canonical) => {
            const diff = diffAgainstCanonical(canonical);
            if (diff.unknownMakes.length || diff.unknownModels.length) {
              // eslint-disable-next-line no-console
              console.warn(
                "[F-5] Vehicle dropdown drift — these entries are NOT in the cost model's training vocabulary:\n" +
                  (diff.unknownMakes.length ? `  Makes:  ${diff.unknownMakes.join(", ")}\n` : "") +
                  (diff.unknownModels.length ? `  Models: ${diff.unknownModels.join(", ")}\n` : "") +
                  "  Estimates for these vehicles will get the +7% per-unknown penalty.",
              );
            }
          })
          .catch(() => {
            // Backend may not be running yet — silent.
          });
      }

      try {
        await loadDamageModel();
        if (cancelled) return;
        setStatus("ready");
        // Preload parts model in the background — first identifyPanel() call is then fast.
        void preloadPartModel();
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[useDamageDetector] load failed:", msg);
        setError(msg);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      // F-3: free the ONNX sessions when the page unmounts so WASM heap
      // (~80–100 MB combined for both models) is reclaimed. Sessions get
      // reloaded from the browser cache if the user comes back, so this
      // is essentially free in user-perceived latency.
      void releaseDamageModel();
      void releasePartModel();
      void releaseDepthModel();
      // Allow the next mount to start fresh (otherwise startedRef.current
      // stays true and the effect skips re-loading).
      startedRef.current = false;
    };
  }, []);

  return { status, error };
}
