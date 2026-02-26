import { apiClient } from "@/lib/api-client";

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
};
