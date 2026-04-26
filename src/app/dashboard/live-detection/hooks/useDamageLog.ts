"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveCapture } from "@/lib/live-detection/capture-store";
import type { Bbox } from "@/lib/live-detection/iou";
import { identifyPanel } from "@/lib/live-detection/part-segmenter";
import type { Detection } from "@/lib/live-detection/tracks";
import {
  type CostEstimateResponse,
  type VendorSearchResponse,
  liveDetectionService,
} from "@/services/live-detection.service";

import type { Vehicle } from "@/lib/live-detection/vehicle";

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
  estimate: CostEstimateResponse | null;
  vendors: VendorSearchResponse | null;
  estimateLoading: boolean;
  estimateError: string | null;
}

interface UseDamageLogArgs {
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
 * Capture the bounding-box region of the video into a JPEG dataURL.
 * Mirrors `new-webxr/src/main.js:480-508` (PAD=12px around the bbox).
 */
async function captureRegion(
  videoEl: HTMLVideoElement,
  bbox: Bbox,
): Promise<string | null> {
  const PAD = 12;
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
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
  ctx.drawImage(videoEl, cx, cy, cw, ch, 0, 0, cw, ch);
  // outline the original damage region inside the crop
  ctx.strokeStyle = "#ff4757";
  ctx.lineWidth = 3;
  ctx.strokeRect(x - cx, y - cy, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function useDamageLog({ videoRef }: UseDamageLogArgs): UseDamageLogReturn {
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
        estimate: null,
        vendors: null,
        estimateLoading: false,
        estimateError: null,
      };
      setEntries((prev) => [...prev, entry]);

      // Async: identify panel
      const video = videoRef.current;
      if (video) {
        identifyPanel(video, det.bbox).then((panel) => {
          setEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, panelLocation: panel } : e)),
          );
        });

        // Async: capture cropped frame -> IndexedDB
        captureRegion(video, det.bbox)
          .then((dataUrl) => {
            if (!dataUrl) return;
            return saveCapture({
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
      const frameArea = video ? video.videoWidth * video.videoHeight : 1280 * 720;
      const [, , bw, bh] = entry.bbox;
      const pxPerCm = Math.sqrt(frameArea) / 60;
      const areaCm2 = +((bw / pxPerCm) * (bh / pxPerCm)).toFixed(2);
      const perimCm = +((bw + bh) * 2 / pxPerCm).toFixed(2);

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
          const result = await liveDetectionService.estimateCost({
            className: entry.className,
            panelLocation: entry.panelLocation ?? undefined,
            confidence: entry.confidence,
            bbox: entry.bbox,
            frameArea,
            vehicleMake: vehicle.make,
            vehicleModel: vehicle.model,
            vehicleYear: vehicle.year,
            areaCm2,
            perimCm,
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
    [videoRef],
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
