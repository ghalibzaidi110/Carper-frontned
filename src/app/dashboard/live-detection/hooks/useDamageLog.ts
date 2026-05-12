"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveCapture } from "@/lib/live-detection/capture-store";
import type { Bbox } from "@/lib/live-detection/iou";
import { identifyPanel } from "@/lib/live-detection/part-segmenter";
import type { Detection } from "@/lib/live-detection/tracks";
import type { DepthEstimation, DepthSource } from "@/lib/live-detection/depth-estimator";
import type { WebXRMeasurement } from "@/lib/live-detection/webxr-depth";
import {
  type CostEstimateResponse,
  type VendorSearchResponse,
  liveDetectionService,
} from "@/services/live-detection.service";

import { resolveCategory, type Vehicle } from "@/lib/live-detection/vehicle";

export const REPAIR_TYPES = new Set(["dent", "scratch", "crack"]);
export const PARTS_TYPES = new Set(["glass_shatter", "tire_flat", "lamp_broken"]);

export interface LogEntry {
  id: number;
  className: string;
  classId: number;
  confidence: number;
  bbox: Bbox;
  timestamp: string;
  panelLocation: string | null;
  /** Panel bbox in video pixel coords; used for panel-as-ruler scaling */
  panelBbox: Bbox | null;
  /** Frame size at the moment the detection was logged: [width, height] */
  frameSize: [number, number] | null;
  estimate: CostEstimateResponse | null;
  vendors: VendorSearchResponse | null;
  estimateLoading: boolean;
  estimateError: string | null;
}

interface UseDamageLogArgs {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** XR canvas ref — used as the capture source when AR mode is active. */
  xrCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  /** Optional depth estimator — called during cost estimation for dent depth classification. */
  estimateDepth?: (
    source: DepthSource,
    damageBbox: Bbox,
    frameWidth: number,
    frameHeight: number,
    panelBbox?: Bbox | null,
  ) => Promise<DepthEstimation | null>;
  /** Whether WebXR AR mode is currently active (Tier 1). */
  xrActive?: boolean;
  /** WebXR measurement function — returns absolute dimensions when AR active. */
  measureDamageXR?: (
    damageBbox: Bbox,
    frameWidth: number,
    frameHeight: number,
  ) => WebXRMeasurement | null;
}

interface UseDamageLogReturn {
  entries: LogEntry[];
  add: (det: Detection) => void;
  remove: (id: number) => void;
  clear: () => void;
  setPanelLocation: (id: number, panel: string) => void;
  runEstimate: (id: number, vehicle: Vehicle) => Promise<LogEntry | null>;
  runEstimateAll: (vehicle: Vehicle) => Promise<LogEntry[]>;
}

let _logId = 0;

/**
 * Capture the bounding-box region of a video or canvas into a JPEG dataURL.
 * Mirrors `new-webxr/src/main.js:480-508` (PAD=12px around the bbox).
 */
async function captureRegion(
  source: HTMLVideoElement | HTMLCanvasElement,
  bbox: Bbox,
): Promise<string | null> {
  const PAD = 12;
  const vw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const vh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  if (!vw || !vh) return null;

  const [x, y, w, h] = bbox;
  const cx = Math.max(0, Math.floor(x - PAD));
  const cy = Math.max(0, Math.floor(y - PAD));
  const cw = Math.min(vw - cx, Math.ceil(w + PAD * 2));
  const ch = Math.min(vh - cy, Math.ceil(h + PAD * 2));
  if (cw <= 0 || ch <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, cx, cy, cw, ch, 0, 0, cw, ch);
  // outline the original damage region inside the crop
  ctx.strokeStyle = "#ff4757";
  ctx.lineWidth = 3;
  ctx.strokeRect(x - cx, y - cy, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function useDamageLog({ videoRef, xrCanvasRef, estimateDepth, xrActive, measureDamageXR }: UseDamageLogArgs): UseDamageLogReturn {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  // Mirror entries into a ref for synchronous reads in async handlers.
  // setState updaters can be deferred / re-run under React 18 Strict Mode,
  // so reading state via setEntries() is unreliable.
  const entriesRef = useRef<LogEntry[]>([]);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const add = useCallback(
    (det: Detection) => {
      const id = ++_logId;
      const entry: LogEntry = {
        id,
        className: det.className,
        classId: det.classId,
        confidence: det.confidence,
        bbox: det.bbox,
        timestamp: new Date().toISOString(),
        panelLocation: null,
        panelBbox: null,
        frameSize: null,
        estimate: null,
        vendors: null,
        estimateLoading: false,
        estimateError: null,
      };
      setEntries((prev) => [...prev, entry]);

      // Async: identify panel (now also returns the panel bbox + frame
      // dimensions so we can do panel-as-ruler scaling in the cost API).
      // Pass `det.className` so the segmenter can restrict candidates to
      // panels physically compatible with the damage type (F-11) — e.g.
      // a `tire_flat` is only allowed to match a `wheel`.
      const video = videoRef.current;
      if (video) {
        // Retry panel identification up to 3 times across different frames.
        // The parts model has weak confidence on single frames (motion blur,
        // angle), so sampling multiple frames increases the chance of a
        // successful identification.
        const MAX_PANEL_RETRIES = 3;
        const PANEL_RETRY_DELAY_MS = 500;
        const panelTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("panel identification timed out")), 8000),
        );
        const attemptPanelId = async () => {
          for (let attempt = 0; attempt < MAX_PANEL_RETRIES; attempt++) {
            const v = videoRef.current;
            if (!v || v.readyState < 2) break;
            const result = await identifyPanel(v, det.bbox, det.className);
            if (result.panel !== "unknown") return result;
            if (attempt < MAX_PANEL_RETRIES - 1) {
              await new Promise((r) => setTimeout(r, PANEL_RETRY_DELAY_MS));
            }
          }
          return { panel: "unknown" as string };
        };
        Promise.race([attemptPanelId(), panelTimeout])
          .then((result) => {
            setEntries((prev) =>
              prev.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      panelLocation: result.panel,
                      panelBbox: ("panelBbox" in result ? result.panelBbox : undefined) ?? null,
                      frameSize: ("frameSize" in result ? result.frameSize : undefined) ?? null,
                    }
                  : e,
              ),
            );
          })
          .catch((err) => {
            console.warn("[useDamageLog] panel ID failed:", err);
            setEntries((prev) =>
              prev.map((e) =>
                e.id === id ? { ...e, panelLocation: "unknown" } : e,
              ),
            );
          });

        // Async: capture cropped frame -> IndexedDB. We pass `entryId`
        // through so the Save-scan flow can later look up this capture
        // by entry without scanning the whole store.
        // In AR mode the video element is hidden; use the XR canvas instead.
        const captureSource: HTMLVideoElement | HTMLCanvasElement | null =
          xrActive && xrCanvasRef?.current ? xrCanvasRef.current : video;
        captureRegion(captureSource, det.bbox)

          .then((dataUrl) => {
            if (!dataUrl) return;
            return saveCapture({
              entryId: id,
              className: det.className,
              classId: det.classId,
              confidence: det.confidence,
              bbox: det.bbox,
              dataUrl,
            });
          })
          .catch((err) => console.warn("[useDamageLog] capture failed:", err));
      }
    },
    [videoRef],
  );

  const remove = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  const setPanelLocation = useCallback((id: number, panel: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, panelLocation: panel } : e)));
  }, []);

  const runEstimateInner = useCallback(
    async (entry: LogEntry, vehicle: Vehicle): Promise<LogEntry> => {
      const video = videoRef.current;
      const vw = video?.videoWidth ?? 0;
      const vh = video?.videoHeight ?? 0;
      const frameArea = vw > 0 && vh > 0 ? vw * vh : 1280 * 720;

      // Do NOT send client-computed areaCm2/perimCm. The backend computes
      // area via three paths (panel_reference > client_provided > fallback).
      // We previously always sent areaCm2 using the same inaccurate
      // fixed-distance formula the backend uses as a last resort. That made
      // the backend pick "client_provided" and suppressed the fallback
      // accuracy warning in the UI. Now we omit these so the backend either
      // uses panel-as-ruler (accurate, when panelBbox present) or correctly
      // falls through to fallback_estimate (which triggers the UI warning).

      // Repair-flow needs a known panel — mirrors webxr/estimate.js:61-68
      if (REPAIR_TYPES.has(entry.className)) {
        if (entry.panelLocation === null) {
          const pending: LogEntry = {
            ...entry,
            estimateLoading: false,
            estimateError: "Panel location still loading — try again in a moment.",
          };
          setEntries((prev) => prev.map((e) => (e.id === entry.id ? pending : e)));
          return pending;
        }
        if (entry.panelLocation === "unknown") {
          const noPanel: LogEntry = {
            ...entry,
            estimateLoading: false,
            estimateError: "Panel could not be identified — re-scan with the part in frame.",
          };
          setEntries((prev) => prev.map((e) => (e.id === entry.id ? noPanel : e)));
          return noPanel;
        }
      }

      // Mark loading
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, estimateLoading: true, estimateError: null } : e,
        ),
      );

      try {
        if (REPAIR_TYPES.has(entry.className)) {
          // ── Tier 1: WebXR absolute measurements ──
          let xrMeasurement: WebXRMeasurement | null = null;
          if (xrActive && measureDamageXR && vw > 0 && vh > 0) {
            try {
              xrMeasurement = measureDamageXR(entry.bbox, vw, vh);
            } catch {
              // WebXR failure is non-fatal — fall through to tier 2
            }
          }

          // ── Tier 2: Monocular depth model (when no WebXR) ──
          let depthResult: DepthEstimation | null = null;
          if (!xrMeasurement && estimateDepth && video && vw > 0 && vh > 0) {
            try {
              depthResult = await estimateDepth(
                video,
                entry.bbox,
                vw,
                vh,
                entry.panelBbox,
              );
            } catch {
              // Depth estimation failure is non-fatal — fall through to tiers 3-4
            }
          }

          const result = await liveDetectionService.estimateCost({
            className: entry.className,
            panelLocation: entry.panelLocation ?? undefined,
            // Panel-as-ruler — backend computes real cm² from panelBbox +
            // frameSize when available. When missing, backend uses its own
            // fallback_estimate path and flags it in scaleSource so the UI
            // can warn the user about lower accuracy.
            panelBbox: entry.panelBbox ?? undefined,
            frameSize: entry.frameSize ?? undefined,
            vehicleCategory: resolveCategory(vehicle),
            confidence: entry.confidence,
            bbox: entry.bbox,
            frameArea,
            vehicleMake: vehicle.make,
            vehicleModel: vehicle.model,
            vehicleYear: vehicle.year,
            // Tier 1: WebXR absolute measurements — override area + depth
            ...(xrMeasurement && {
              scaleSource: "webxr_depth" as const,
              areaCm2: xrMeasurement.areaCm2,
              perimCm: xrMeasurement.perimCm,
              depthMm: xrMeasurement.depthMm,
              depthSource: "webxr" as const,
            }),
            // Tier 2: Depth model — only sent when no WebXR
            ...(!xrMeasurement && depthResult && {
              depthSource: "depth_model" as const,
              depthCategory: depthResult.depthCategory,
              relativeDepthDelta: depthResult.relativeDepthDelta,
            }),
          });
          const updated: LogEntry = {
            ...entry,
            estimate: result,
            vendors: null,
            estimateLoading: false,
            estimateError: null,
          };
          setEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)));
          return updated;
        }

        if (PARTS_TYPES.has(entry.className)) {
          const result = await liveDetectionService.searchVendors({
            damageType: entry.className as
              | "glass_shatter"
              | "tire_flat"
              | "lamp_broken",
            panelLocation: entry.panelLocation ?? undefined,
            vehicle,
          });
          const updated: LogEntry = {
            ...entry,
            estimate: null,
            vendors: result,
            estimateLoading: false,
            estimateError: null,
          };
          setEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)));
          return updated;
        }

        // Unknown class — flag and return
        const noMatch: LogEntry = {
          ...entry,
          estimateLoading: false,
          estimateError: `No estimator for "${entry.className}"`,
        };
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? noMatch : e)));
        return noMatch;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const failed: LogEntry = {
          ...entry,
          estimateLoading: false,
          estimateError: msg,
        };
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? failed : e)));
        return failed;
      }
    },
    [videoRef, estimateDepth, xrActive, measureDamageXR],
  );

  const runEstimate = useCallback(
    async (id: number, vehicle: Vehicle): Promise<LogEntry | null> => {
      const entry = entriesRef.current.find((e) => e.id === id);
      if (!entry) return null;
      return runEstimateInner(entry, vehicle);
    },
    [runEstimateInner],
  );

  const runEstimateAll = useCallback(
    async (vehicle: Vehicle): Promise<LogEntry[]> => {
      const snapshot = entriesRef.current.slice();
      const results = await Promise.all(snapshot.map((e) => runEstimateInner(e, vehicle)));
      return results;
    },
    [runEstimateInner],
  );

  return { entries, add, remove, clear, setPanelLocation, runEstimate, runEstimateAll };
}
