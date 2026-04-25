"use client";

import { useEffect, useRef, useState } from "react";

import { loadDamageModel } from "@/lib/live-detection/detector";
import { preloadPartModel } from "@/lib/live-detection/part-segmenter";

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
    };
  }, []);

  return { status, error };
}
