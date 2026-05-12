import { isAxiosError } from "axios";

import { apiClient } from "@/lib/api-client";

import type { Bbox } from "@/lib/live-detection/iou";

/**
 * Extract the actual reason out of an axios error. NestJS's class-validator
 * pipe responds with `{ statusCode, message, error }` where `message` is
 * either a string or string[] of human-readable rules. The default axios
 * message ("Request failed with status code 400") drops all of that on
 * the floor — so we surface the body so the UI can show a real error.
 */
function extractApiError(err: unknown, fallback: string): Error {
  if (isAxiosError(err)) {
    if (err.code === "ERR_CANCELED") {
      return new Error(`${fallback} (request timed out — backend slow or offline)`);
    }
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg) && msg.length) {
      const head = msg[0];
      const rest = msg.length - 1;
      return new Error(rest > 0 ? `${head} (+${rest} more)` : head);
    }
    if (typeof msg === "string" && msg.length) return new Error(msg);
    if (err.response?.status) return new Error(`${fallback} (HTTP ${err.response.status})`);
    if (err.message) return new Error(err.message);
  }
  if (err instanceof Error) return err;
  return new Error(fallback);
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
  multipleDentsCount?: number;
  partsCost?: number;
  // Depth/measurement tier fields
  scaleSource?: "webxr_depth" | "depth_model" | "panel_reference" | "fallback_estimate";
  depthMm?: number;
  depthSource?: "webxr" | "depth_model" | "heuristic";
  depthCategory?: "shallow" | "moderate" | "deep";
  relativeDepthDelta?: number;
}

export interface CostEstimateResponse {
  cost: number;
  costLow: number;
  costHigh: number;
  currency: string;
  severity: string;
  /** Human-readable severity, e.g. "Moderate (3.2% of hood area)" */
  severityDetail?: string;
  decision: "repair" | "replace" | "unknown";
  unknownFeatures: string[];
  /** 0–1 confidence score for this estimate (driven by scale source, unknowns, decision). */
  estimateConfidence?: number;
  /** Human-readable confidence explanation, e.g. "60% confidence: panel not fully visible" */
  confidenceDetail?: string;
  /** Identifies which trained model produced this prediction (e.g. "v4"). */
  modelVersion?: string;
  /** Request ID for replay/audit — auto-generated if not provided */
  requestId?: string;
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
    scaleSource?: "webxr_depth" | "depth_model" | "panel_reference" | "client_provided" | "fallback_estimate";
    /** Absolute error margin in PKR */
    errorMargin?: number;
    /** Error margin as percentage of predicted cost */
    errorMarginPct?: number;
    /** Dent depth in mm (when available from WebXR) */
    depthMm?: number | null;
    /** Source of depth measurement */
    depthSource?: "webxr" | "depth_model" | "heuristic" | null;
  };
}

export const liveDetectionService = {
  async estimateCost(payload: CostEstimatePayload): Promise<CostEstimateResponse> {
    const { data } = await apiClient.post<{ success: boolean; data: CostEstimateResponse }>(
      "/live-detection/estimate",
      payload,
    );
    return data.data;
  },

  async searchVendors(payload: VendorSearchPayload): Promise<VendorSearchResponse> {
    const { data } = await apiClient.post<{ success: boolean; data: VendorSearchResponse }>(
      "/live-detection/vendors",
      payload,
    );
    return data.data;
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

// ── Saved scans (DamageScan persistence) ─────────────────────────────

/** Per-row payload sent to POST /scans alongside the multipart files. */
export interface SaveScanEntry {
  id: number;
  className: string;
  classId?: number;
  confidence?: number;
  bbox?: number[];
  panelLocation?: string | null;
  panelBbox?: number[] | null;
  frameSize?: [number, number] | null;
  timestamp?: string;
  estimate?: CostEstimateResponse | null;
  vendors?: VendorSearchResponse | null;
  estimateError?: string | null;
}

export interface SaveScanPayload {
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleCategory?: "sedan" | "hatchback" | "suv" | "pickup" | "minivan";
  carId?: string;
  totalCostPkr: number;
  totalLowPkr: number;
  totalHighPkr: number;
  costModelVersion?: string;
  damageModelVersion?: string;
  entries: SaveScanEntry[];
  notes?: string;
}

/** A DamageScan row as returned by GET /scans/me (no detectionsJson). */
export interface SavedScanSummary {
  id: string;
  userId: string;
  carId: string | null;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleCategory: string | null;
  totalCostPkr: number;
  totalLowPkr: number;
  totalHighPkr: number;
  entryCount: number;
  failedCount: number;
  dentCount: number;
  scratchCount: number;
  crackCount: number;
  glassShatterCount: number;
  lampBrokenCount: number;
  tireFlatCount: number;
  costModelVersion: string | null;
  damageModelVersion: string | null;
  coverImageUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Full scan with detectionsJson — returned by GET /scans/:id. */
export interface SavedScanDetail extends SavedScanSummary {
  detectionsJson: Array<
    SaveScanEntry & {
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
    }
  >;
}

export const liveDetectionScansService = {
  /**
   * Save a finished scan. `images` maps entry-id → JPEG Blob (compressed).
   * Built as multipart so backend can stream each file straight to
   * Cloudinary without a base64 round-trip.
   */
  async save(
    payload: SaveScanPayload,
    images: Map<number, Blob>,
  ): Promise<{ id: string }> {
    const form = new FormData();
    form.append("payload", JSON.stringify(payload));
    for (const [entryId, blob] of images) {
      // Field name `entry-<id>` matches the regex on the backend that
      // pairs each upload back to its entry.
      form.append(`entry-${entryId}`, blob, `entry-${entryId}.jpg`);
    }
    try {
      const { data } = await apiClient.post<{ success: boolean; data: { id: string } }>(
        "/live-detection/scans",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          // Allow uploads up to 5 minutes for slow connections.
          timeout: 5 * 60_000,
        },
      );
      return data.data;
    } catch (err) {
      throw extractApiError(err, "Save scan failed");
    }
  },

  async listMine(opts?: { take?: number; cursor?: string }): Promise<{
    items: SavedScanSummary[];
    nextCursor: string | null;
  }> {
    const params = new URLSearchParams();
    if (opts?.take) params.set("take", String(opts.take));
    if (opts?.cursor) params.set("cursor", opts.cursor);
    const url = `/live-detection/scans/me${params.toString() ? `?${params.toString()}` : ""}`;
    try {
      const { data } = await apiClient.get<{
        success: boolean;
        data: { items: SavedScanSummary[]; nextCursor: string | null };
      }>(url, { timeout: 15_000 });
      return data.data;
    } catch (err) {
      throw extractApiError(err, "Couldn't load scans");
    }
  },

  async getOne(id: string): Promise<SavedScanDetail> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: SavedScanDetail }>(
        `/live-detection/scans/${id}`,
        { timeout: 15_000 },
      );
      return data.data;
    } catch (err) {
      throw extractApiError(err, "Couldn't load scan");
    }
  },

  async deleteOne(id: string): Promise<{ deleted: true }> {
    try {
      const { data } = await apiClient.delete<{ success: boolean; data: { deleted: true } }>(
        `/live-detection/scans/${id}`,
        { timeout: 15_000 },
      );
      return data.data;
    } catch (err) {
      throw extractApiError(err, "Couldn't delete scan");
    }
  },
};
