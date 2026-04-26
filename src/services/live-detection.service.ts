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
};
