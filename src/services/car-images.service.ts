import { apiClient } from "@/lib/api-client";

export const carImagesService = {
  async uploadRegistration(carId: string, files: { front: File; back: File; left: File; right: File }) {
    const formData = new FormData();
    formData.append("front", files.front);
    formData.append("back", files.back);
    formData.append("left", files.left);
    formData.append("right", files.right);
    const { data } = await apiClient.post(`/car-images/${carId}/registration`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async uploadPeriodic(carId: string, files: { front: File; back: File; left: File; right: File }) {
    const formData = new FormData();
    formData.append("front", files.front);
    formData.append("back", files.back);
    formData.append("left", files.left);
    formData.append("right", files.right);
    const { data } = await apiClient.post(`/car-images/${carId}/periodic`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async uploadSingle(carId: string, file: File, category: string) {
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await apiClient.post(`/car-images/${carId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params: { category },
    });
    return data.data;
  },

  async getAll(carId: string) {
    const { data } = await apiClient.get(`/car-images/${carId}`);
    return data.data;
  },

  async getRegistration(carId: string) {
    const { data } = await apiClient.get(`/car-images/${carId}/registration`);
    return data.data;
  },

  async getInspectionHistory(carId: string) {
    const { data } = await apiClient.get(`/car-images/${carId}/inspection-history`);
    return data.data;
  },
};
