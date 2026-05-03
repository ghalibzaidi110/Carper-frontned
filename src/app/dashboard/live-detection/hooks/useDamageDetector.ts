"use client";

import { useEffect, useRef, useState } from "react";

import { pruneOldCaptures } from "@/lib/live-detection/capture-store";
import { loadDamageModel, releaseDamageModel } from "@/lib/live-detection/detector";
import { releasePartModel } from "@/lib/live-detection/part-segmenter";
import { diffAgainstCanonical } from "@/lib/live-detection/vehicle";
import { liveDetectionService } from "@/services/live-detection.service";

export type ModelStatus = "idle" | "loading" | "ready" | "error";

/**
 * Result of the page-load health probe against the backend cost service.
 * `healthy: true` means we successfully reached NestJS AND Python's cost
 * model is loaded; everything else means cost estimation will fail and
 * the user should see a banner up front (instead of after they've
 * already logged a dozen damages and clicked Estimate all).
 */
export interface BackendHealth {
  healthy: boolean;
  message: string | null; // null when healthy
}

interface UseDamageDetector {
  status: ModelStatus;
  error: string | null;
  backendHealth: BackendHealth | null; // null while still probing
}

/**
 * Loads the YOLOv8 damage model on mount. The parts model is intentionally
 * NOT preloaded (D-3) — its background load was contending with live YOLO
 * inference on the same single WASM thread and making the first ~10 s of
 * detection feel laggy. It now loads lazily on the first `identifyPanel`
 * call (i.e. when the user clicks "Log"), with a "identifying…" spinner
 * surfaced in the Damage Log entry's Panel field. After that first load,
 * the parts model is in browser cache and inference is fast.
 *
 * Both models are cached to the Cache API after first download, so
 * subsequent visits are instant.
 */
export function useDamageDetector(): UseDamageDetector {
  const [status, setStatus] = useState<ModelStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // guard against React Strict Mode double-mount
    startedRef.current = true;

    let cancelled = false;

    // Backend health probe (Change 3). Runs in parallel with the model
    // load so the user sees the banner instantly if NestJS or Python is
    // down — they don't have to wait for the 12 MB ONNX download to
    // finish before discovering cost estimates won't work.
    void liveDetectionService
      .health()
      .then((h) => {
        if (cancelled) return;
        if (!h.pythonHealthy) {
          setBackendHealth({
            healthy: false,
            message: "Python cost service is offline. Restart it on port 8000 — cost estimates will fail until you do.",
          });
        } else if (!h.costModelLoaded) {
          setBackendHealth({
            healthy: false,
            message: "Python cost model didn't load. Check the Python terminal — cost estimates will fail until the model is fixed.",
          });
        } else {
          setBackendHealth({ healthy: true, message: null });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setBackendHealth({
          healthy: false,
          message: `Couldn't reach the backend (${msg}). Check that NestJS is running on port 3000 — cost estimates will fail until it is.`,
        });
      });

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
        // D-3: parts model is loaded lazily on first identifyPanel() call,
        // not preloaded here. Eliminates the WASM-thread contention that
        // made the first ~10 s of live detection stutter.
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
      // Allow the next mount to start fresh (otherwise startedRef.current
      // stays true and the effect skips re-loading).
      startedRef.current = false;
    };
  }, []);

  return { status, error, backendHealth };
}
