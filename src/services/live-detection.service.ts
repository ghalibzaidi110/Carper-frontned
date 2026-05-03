import { isAxiosError } from "axios";

import { apiClient } from "@/lib/api-client";

import type { Bbox } from "@/lib/live-detection/iou";

/**
 * Extract the actual reason out of an axios error. NestJS's
 * class-validator pipe responds with `{ statusCode, message, error }`
 * where `message` is either a string or a string[] of human-readable
 * field rules ("frameSize each value must be an integer number"). The
 * default axios message ("Request failed with status code 400") drops
 * all of that on the floor — so we surface the body instead so the
 * Damage Log / Report Dialog can show why a row failed.
 */
function extractApiError(err: unknown, fallback: string): Error {
  if (isAxiosError(err)) {
    // Distinguish "we hit the abort controller" from a real server error.
    // Axios surfaces aborted requests with `code === "ERR_CANCELED"`.
    if (err.code === "ERR_CANCELED") {
      return new Error(`${fallback} (request timed out — backend slow or offline)`);
    }
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg) && msg.length) {
      // Take the first violation; most useful when there's just one.
      // If multiple, append "(+N more)" so the user knows the list
      // wasn't truncated for length reasons.
      const head = msg[0];
      const rest = msg.length - 1;
      return new Error(rest > 0 ? `${head} (+${rest} more)` : head);
    }
    if (typeof msg === "string" && msg.length) {
      return new Error(msg);
    }
    if (err.response?.status) {
      return new Error(`${fallback} (HTTP ${err.response.status})`);
    }
    if (err.message) return new Error(err.message);
  }
  if (err instanceof Error) return err;
  return new Error(fallback);
}

// ── Payload sanitization (Change 2) ─────────────────────────────────
//
// The F-7 DTO validators on the NestJS side are strict by design:
// frameSize must be int[], bbox values must be in [0, MAX_PIXEL_DIMENSION],
// vehicleYear must be int in [1990, currentYear+1], etc. Type drift in
// the frontend (a float sneaking into frameSize, a string year coming
// out of a select) was producing 400 Bad Requests that looked like
// bugs but were just mismatched edges. Sanitizing here means the
// validators only catch *real* garbage.

const MAX_PIXEL_DIMENSION = 8000;
const MIN_VEHICLE_YEAR = 1990;
const MAX_FRAME_AREA = MAX_PIXEL_DIMENSION * MAX_PIXEL_DIMENSION;

/** Clamp a number into [min, max]. Falls back to `min` if value isn't finite. */
function clamp(n: unknown, min: number, max: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(Math.max(v, min), max);
}

/**
 * Strip / coerce values into shapes the NestJS DTO will accept. Returns
 * a NEW payload object — does not mutate the input. Pure function.
 */
function sanitizeCostPayload(p: CostEstimatePayload): CostEstimatePayload {
  const currentYear = new Date().getFullYear();
  const out: CostEstimatePayload = {
    className: p.className,
    confidence: clamp(p.confidence, 0, 1),
    bbox: p.bbox.map((v) => clamp(v, 0, MAX_PIXEL_DIMENSION)) as Bbox,
  };

  if (p.panelLocation) out.panelLocation = p.panelLocation;
  if (p.vehicleCategory) out.vehicleCategory = p.vehicleCategory;
  if (p.severity) out.severity = p.severity;
  if (p.vehicleMake) out.vehicleMake = p.vehicleMake;
  if (p.vehicleModel) out.vehicleModel = p.vehicleModel;

  if (p.panelBbox && p.panelBbox.length === 4) {
    out.panelBbox = p.panelBbox.map((v) => clamp(v, 0, MAX_PIXEL_DIMENSION));
  }
  if (p.frameSize && p.frameSize.length === 2) {
    // DTO requires @IsInt — round defensively so a float here can't 400.
    out.frameSize = [
      Math.round(clamp(p.frameSize[0], 1, MAX_PIXEL_DIMENSION)),
      Math.round(clamp(p.frameSize[1], 1, MAX_PIXEL_DIMENSION)),
    ];
  }
  if (p.frameArea !== undefined) {
    out.frameArea = clamp(p.frameArea, 1, MAX_FRAME_AREA);
  }
  if (p.vehicleYear !== undefined) {
    out.vehicleYear = Math.round(clamp(p.vehicleYear, MIN_VEHICLE_YEAR, currentYear + 1));
  }
  if (p.areaCm2 !== undefined) {
    out.areaCm2 = +clamp(p.areaCm2, 0, 1_000_000).toFixed(2);
  }
  if (p.perimCm !== undefined) {
    out.perimCm = +clamp(p.perimCm, 0, 100_000).toFixed(2);
  }

  return out;
}

// ── Request timeout (Change 4) ──────────────────────────────────────
//
// `apiClient` (axios) has no default request timeout, so a hung backend
// would leave the cost-estimate / vendor-search call pending
// indefinitely. 15 s is generous: NestJS forwards to Python with a
// 30 s ceiling, but if the call hasn't roundtripped after 15 s
// something is wrong (Python down, network blip, NestJS overloaded)
// and the user is better served by a fast clear error.

const REQUEST_TIMEOUT_MS = 15_000;

/** Build an AbortController + timer that auto-aborts after the given ms. */
function withTimeout(): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) };
}

// ── Vendor search ──

export interface VehiclePayload {
  make?: string;
  model?: string;
  year?: number;
}

export interface VendorSearchPayload {
  damageType: "glass_shatter" | "tire_flat" | "lamp_broken";
  vehicle?: VehiclePayload;
  panelLocation?: string;
}

export interface Vendor {
  name: string;
  price: number;
  currency: "PKR" | "USD";
  url: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  partName: string;
  deliveryDays: number | null;
  thumbnail: string | null;
  oldPrice: number | null;
  badge: string | null;
}

export interface VendorFallback {
  min: number;
  max: number;
  currency: "PKR";
  partName: string;
  note: string;
}

export interface VendorSearchResponse {
  vendors: Vendor[];
  fallbackEstimate: VendorFallback | null;
}

// ── Cost estimate ──

export interface CostEstimatePayload {
  className: string;
  panelLocation?: string;
  /** Panel bbox in pixel coords [x, y, w, h] — used for panel-as-ruler scaling */
  panelBbox?: number[];
  /** [width, height] of the source frame in pixels */
  frameSize?: [number, number];
  /** Vehicle body category — sedan, hatchback, suv, pickup, minivan */
  vehicleCategory?: "sedan" | "hatchback" | "suv" | "pickup" | "minivan";
  confidence: number;
  bbox: Bbox | number[];
  frameArea?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  areaCm2?: number;
  perimCm?: number;
  severity?: "minor" | "moderate" | "significant" | "severe";
}

export interface CostEstimateResponse {
  cost: number;
  costLow: number;
  costHigh: number;
  currency: string;
  severity: string;
  decision: "repair" | "replace" | "unknown";
  unknownFeatures: string[];
  /** Identifies which trained model produced this prediction (e.g. "v1"). */
  modelVersion?: string;
  breakdown: {
    repairMethod: string;
    laborHours: number;
    paintCost: number;
    areaCm2: number;
    perimeterCm: number;
    material: string;
    severityScore: string;
    /**
     * How was the area calculated?
     *  - "panel_reference"   real cm² via panel-as-ruler (most accurate)
     *  - "client_provided"   client computed and sent
     *  - "fallback_estimate" fixed-distance assumption (least accurate)
     */
    scaleSource?: "panel_reference" | "client_provided" | "fallback_estimate";
  };
}

export const liveDetectionService = {
  async estimateCost(payload: CostEstimatePayload): Promise<CostEstimateResponse> {
    const sanitized = sanitizeCostPayload(payload);
    const { signal, cancel } = withTimeout();
    try {
      const { data } = await apiClient.post<{ success: boolean; data: CostEstimateResponse }>(
        "/live-detection/estimate",
        sanitized,
        { signal },
      );
      return data.data;
    } catch (err) {
      throw extractApiError(err, "Cost estimate failed");
    } finally {
      cancel();
    }
  },

  async searchVendors(payload: VendorSearchPayload): Promise<VendorSearchResponse> {
    const { signal, cancel } = withTimeout();
    try {
      const { data } = await apiClient.post<{ success: boolean; data: VendorSearchResponse }>(
        "/live-detection/vendors",
        payload,
        { signal },
      );
      return data.data;
    } catch (err) {
      throw extractApiError(err, "Vendor search failed");
    } finally {
      cancel();
    }
  },

  async health(): Promise<{
    pythonHealthy: boolean;
    costModelLoaded: boolean;
    serpApiConfigured: boolean;
    vendorCacheSize: number;
    pythonUrl: string;
  }> {
    const { data } = await apiClient.get("/live-detection/health");
    return data.data;
  },

  /**
   * F-5: Fetch the canonical list of vehicles the cost model knows.
   * Use to validate the frontend's hardcoded dropdown — if a make/model
   * appears in the UI but not here, the model treats it as "unknown" and
   * widens the cost-estimate error band.
   */
  async knownVehicles(): Promise<{
    modelVersion: string | null;
    makes: string[];
    models: string[];
    panels: string[];
  }> {
    const { data } = await apiClient.get("/live-detection/known-vehicles");
    return data.data;
  },
};
