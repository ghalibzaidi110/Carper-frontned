"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Bbox } from "@/lib/live-detection/iou";
import {
  isWebXRDepthAvailable,
  WebXRDepthSession,
  type WebXRMeasurement,
} from "@/lib/live-detection/webxr-depth";

export type XRStatus = "unavailable" | "idle" | "starting" | "active" | "error";

interface UseWebXRDepth {
  /** Whether WebXR immersive-ar + depth-sensing is supported on this device. */
  xrAvailable: boolean;
  /** Current XR session status. */
  xrStatus: XRStatus;
  /** Error message if XR session failed. */
  xrError: string | null;
  /** Start AR mode — stops regular camera, starts XR session on given canvas. */
  startAR: (canvas: HTMLCanvasElement) => Promise<void>;
  /** Stop AR mode — ends XR session. Caller restarts regular camera. */
  stopAR: () => void;
  /** Measure damage from current XR frame. Returns null when no depth data. */
  measureDamageXR: (
    damageBbox: Bbox,
    frameWidth: number,
    frameHeight: number,
  ) => WebXRMeasurement | null;
}

/**
 * React hook for WebXR depth-sensing AR mode (Tier 1).
 *
 * On mount, checks device support. When the user activates AR mode,
 * manages the XR session lifecycle and exposes measureDamageXR() for
 * absolute real-world measurements.
 */
export function useWebXRDepth(): UseWebXRDepth {
  const [xrAvailable, setXrAvailable] = useState(false);
  const [xrStatus, setXrStatus] = useState<XRStatus>("unavailable");
  const [xrError, setXrError] = useState<string | null>(null);
  const sessionRef = useRef<WebXRDepthSession | null>(null);

  // Check device support on mount
  useEffect(() => {
    let cancelled = false;
    isWebXRDepthAvailable().then((ok) => {
      if (cancelled) return;
      setXrAvailable(ok);
      if (ok) setXrStatus("idle");
    });
    return () => {
      cancelled = true;
      // Cleanup any active session
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  const startAR = useCallback(async (canvas: HTMLCanvasElement) => {
    if (sessionRef.current?.isActive) return;

    setXrStatus("starting");
    setXrError(null);

    const session = new WebXRDepthSession();
    sessionRef.current = session;

    try {
      await session.start(canvas);
      setXrStatus("active");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useWebXRDepth] start failed:", msg);
      setXrError(msg);
      setXrStatus("error");
      sessionRef.current = null;
    }
  }, []);

  const stopAR = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setXrStatus("idle");
    setXrError(null);
  }, []);

  const measureDamageXR = useCallback(
    (
      damageBbox: Bbox,
      frameWidth: number,
      frameHeight: number,
    ): WebXRMeasurement | null => {
      if (!sessionRef.current?.isActive) return null;
      return sessionRef.current.measureDamage(damageBbox, frameWidth, frameHeight);
    },
    [],
  );

  return { xrAvailable, xrStatus, xrError, startAR, stopAR, measureDamageXR };
}
