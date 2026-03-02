import { apiClient } from "@/lib/api-client";

export interface DamageScanResult {
  originalImageUrl: string;
  processedImageUrl: string;
  hasDamage: boolean;
  confidence: number;
  detections: Array<{ label?: string; confidence?: number; bbox?: number[] }>;
  severity: string;
}

export interface DamageScanResponse {
  summary: {
    totalImages: number;
    imagesWithDamage: number;
    isDemoMode: boolean;
  };
  results: DamageScanResult[];
}

export const damageDetectionService = {
  async detectImage(imageId: string) {
    const { data } = await apiClient.post("/damage-detection/image", { imageId });
    return data.data;
  },

  async detectCar(carId: string) {
    const { data } = await apiClient.post("/damage-detection/car", { carId });
    return data.data;
  },

  async getHistory(carId: string) {
    const { data } = await apiClient.get(`/damage-detection/history/${carId}`);
    return data.data;
  },

  /**
   * Upload image(s) for damage detection scan.
   * Single image: pass one file. Multiple: pass up to 10 files.
   * Works without a registered car. Uses demo mode when Python service is unavailable.
   */
  async scanImages(files: File | File[]): Promise<DamageScanResponse> {
    const formData = new FormData();
    if (Array.isArray(files)) {
      if (files.length === 0) throw new Error("At least one image is required");
      if (files.length > 10) throw new Error("Maximum 10 images allowed");
      files.forEach((file) => formData.append("images", file));
    } else {
      formData.append("image", files);
    }
    const { data } = await apiClient.post<{ success: boolean; data: DamageScanResponse }>(
      "/damage-detection/scan",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data.data;
  },
};
