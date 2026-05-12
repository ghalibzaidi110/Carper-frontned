"use client";

import { useCallback, useRef, useState } from "react";

import { getCaptureForEntry } from "@/lib/live-detection/capture-store";
import { DAMAGE_MODEL_VERSION } from "@/lib/live-detection/detector";
import { compressDataUrlToJpegBlob } from "@/lib/live-detection/image-compress";
import { resolveCategory, type Vehicle, type VehicleCategory } from "@/lib/live-detection/vehicle";
import {
  liveDetectionScansService,
  type SaveScanEntry,
  type SaveScanPayload,
} from "@/services/live-detection.service";

import type { LogEntry } from "./useDamageLog";

export type SaveScanStatus = "idle" | "preparing" | "uploading" | "saved" | "error";

export interface SaveScanState {
  status: SaveScanStatus;
  /** 1-based: current image being compressed/uploaded. */
  current: number;
  /** Total entries with images (excludes entries that had no capture). */
  total: number;
  /** UUID of the persisted scan, set on success. */
  savedScanId: string | null;
  /** Surface-able error message; cleared on next save attempt. */
  error: string | null;
}

const INITIAL: SaveScanState = {
  status: "idle",
  current: 0,
  total: 0,
  savedScanId: null,
  error: null,
};

interface UseSaveScanReturn {
  state: SaveScanState;
  /**
   * Save the current Damage Log to the user's history. Pure trigger —
   * the caller passes a snapshot of entries + the vehicle picked.
   * Returns the saved scan id on success (also stored in `state`),
   * `null` on failure (`state.error` carries the reason).
   */
  save: (entries: LogEntry[], vehicle: Vehicle) => Promise<string | null>;
  /** Reset state back to idle (e.g. when user starts a new scan). */
  reset: () => void;
}

export function useSaveScan(): UseSaveScanReturn {
  const [state, setState] = useState<SaveScanState>(INITIAL);
  // Guard against double-click — the second call resolves to the
  // in-flight save's id instead of starting a parallel save.
  const inflightRef = useRef<Promise<string | null> | null>(null);

  const save = useCallback(
    async (entries: LogEntry[], vehicle: Vehicle): Promise<string | null> => {
      if (inflightRef.current) return inflightRef.current;
      const run = (async (): Promise<string | null> => {
        if (entries.length === 0) {
          setState({ ...INITIAL, status: "error", error: "Nothing to save — log a damage first." });
          return null;
        }

        setState({
          status: "preparing",
          current: 0,
          total: 0,
          savedScanId: null,
          error: null,
        });

        // ── Gather + compress images ──
        const images = new Map<number, Blob>();
        let prepared = 0;
        // Walk entries in order so the toast counter feels intuitive.
        for (const entry of entries) {
          try {
            const capture = await getCaptureForEntry(entry.id);
            if (capture?.dataUrl) {
              const blob = await compressDataUrlToJpegBlob(capture.dataUrl);
              if (blob) {
                images.set(entry.id, blob);
                prepared += 1;
                setState((prev) => ({
                  ...prev,
                  status: "preparing",
                  current: prepared,
                  total: prepared, // we update both as we go since we don't know total yet
                }));
              }
            }
          } catch (err) {
            // Compression failure is non-fatal; the entry still saves
            // without an image. Logged so we notice systemic problems.
            console.warn(
              `[useSaveScan] image prep failed for entry ${entry.id}:`,
              err instanceof Error ? err.message : err,
            );
          }
        }

        const totalImages = images.size;
        setState({
          status: "uploading",
          current: 0,
          total: totalImages,
          savedScanId: null,
          error: null,
        });

        // ── Build the metadata payload ──
        const totals = entries.reduce(
          (acc, e) => {
            if (e.estimate) {
              acc.cost += e.estimate.cost;
              acc.low += e.estimate.costLow;
              acc.high += e.estimate.costHigh;
            } else if (e.vendors?.vendors?.[0]) {
              const v = e.vendors.vendors[0];
              const priced = v.currency === "USD" ? v.price * 278 : v.price;
              acc.cost += priced;
              acc.low += priced;
              acc.high += priced * 1.15;
            } else if (e.vendors?.fallbackEstimate) {
              const f = e.vendors.fallbackEstimate;
              acc.cost += (f.min + f.max) / 2;
              acc.low += f.min;
              acc.high += f.max;
            }
            return acc;
          },
          { cost: 0, low: 0, high: 0 },
        );

        // Drop frontend-only fields the backend doesn't need (loading
        // flags, etc.) and trim to a payload-friendly shape. The full
        // entry survives in detectionsJson server-side.
        const payloadEntries: SaveScanEntry[] = entries.map((e) => ({
          id: e.id,
          className: e.className,
          classId: e.classId,
          confidence: e.confidence,
          bbox: e.bbox,
          panelLocation: e.panelLocation,
          panelBbox: e.panelBbox,
          frameSize: e.frameSize,
          timestamp: e.timestamp,
          estimate: e.estimate,
          vendors: e.vendors,
          estimateError: e.estimateError,
        }));

        // Cost-model version isn't a frontend constant — read it back
        // from the first successful estimate. If no estimate succeeded
        // (every row failed), leave undefined.
        const costModelVersion = entries.find((e) => e.estimate?.modelVersion)?.estimate
          ?.modelVersion;

        const category: VehicleCategory = resolveCategory(vehicle);
        const payload: SaveScanPayload = {
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleYear: vehicle.year,
          vehicleCategory: category,
          totalCostPkr: Math.round(totals.cost),
          totalLowPkr: Math.round(totals.low),
          totalHighPkr: Math.round(totals.high),
          costModelVersion,
          damageModelVersion: DAMAGE_MODEL_VERSION,
          entries: payloadEntries,
        };

        // ── POST it ──
        try {
          const result = await liveDetectionScansService.save(payload, images);
          setState({
            status: "saved",
            current: totalImages,
            total: totalImages,
            savedScanId: result.id,
            error: null,
          });
          return result.id;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Save failed";
          setState({
            status: "error",
            current: 0,
            total: totalImages,
            savedScanId: null,
            error: msg,
          });
          return null;
        }
      })();

      inflightRef.current = run;
      try {
        return await run;
      } finally {
        inflightRef.current = null;
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL), []);

  return { state, save, reset };
}
