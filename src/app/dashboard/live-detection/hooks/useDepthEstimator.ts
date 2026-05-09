"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Bbox } from "@/lib/live-detection/iou";
import {
  type DepthEstimation,
  type DepthSource,
  classifyDentDepth,
  estimateDepthMap,
  isDepthModelLoaded,
  loadDepthModel,
  releaseDepthModel,
  sampleDepthAtBbox,
} from "@/lib/live-detection/depth-estimator";

export type DepthModelStatus = "idle" | "loading" | "ready" | "error";

interface UseDepthEstimator {
  /** Current model loading status. Stays "idle" until first estimate request. */
  depthModelStatus: DepthModelStatus;
  depthModelError: string | null;
  /**
   * Run depth estimation on the current frame for a given damage bbox.
   * Lazy-loads the model on first call (~50 MB download, cached after).
   * Returns null if inference fails.
   */
  estimateDepth: (
    source: DepthSource,
    damageBbox: Bbox,
    frameWidth: number,
    frameHeight: number,
    panelBbox?: Bbox | null,
  ) => Promise<DepthEstimation | null>;
}

/**
 * React hook for on-demand monocular depth estimation.
 *
 * Unlike useDamageDetector (which preloads on mount), the depth model
 * is lazy — the ~50 MB download only starts when the user first requests
 * a cost estimate. After that, the model stays loaded for the session
 * and is cached via Browser Cache API for subsequent visits.
 */
export function useDepthEstimator(): UseDepthEstimator {
  const [depthModelStatus, setStatus] = useState<DepthModelStatus>("idle");
  const [depthModelError, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // Cleanup on unmount (F-3 pattern)
  useEffect(() => {
    return () => {
      void releaseDepthModel();
    };
  }, []);

  const estimateDepth = useCallback(
    async (
      source: DepthSource,
      damageBbox: Bbox,
      frameWidth: number,
      frameHeight: number,
      panelBbox?: Bbox | null,
    ): Promise<DepthEstimation | null> => {
      // Lazy-load model on first call
      if (!isDepthModelLoaded() && !loadingRef.current) {
        loadingRef.current = true;
        setStatus("loading");
        setError(null);
        try {
          await loadDepthModel();
          setStatus("ready");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[useDepthEstimator] load failed:", msg);
          setError(msg);
          setStatus("error");
          loadingRef.current = false;
          return null;
        }
        loadingRef.current = false;
      }

      // Wait for in-progress load
      if (loadingRef.current) return null;

      // Run inference
      try {
        const result = await estimateDepthMap(source);
        if (!result) return null;

        const { map, width, height } = result;
        const { relativeDepthDelta } = sampleDepthAtBbox(
          map,
          width,
          height,
          damageBbox,
          frameWidth,
          frameHeight,
          panelBbox,
        );

        return classifyDentDepth(relativeDepthDelta);
      } catch (err) {
        console.warn("[useDepthEstimator] inference failed:", (err as Error).message);
        return null;
      }
    },
    [],
  );

  return { depthModelStatus, depthModelError, estimateDepth };
}
