import { apiClient } from "@/lib/api-client";

import type { Bbox } from "@/lib/live-detection/iou";

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
