import { apiClient } from "@/lib/api-client";

export interface RegisterCarPayload {
  catalogId: string;
  registrationNumber: string;
  vinNumber?: string;
  color: string;
  mileage: number;
  condition: "NEW" | "USED" | "DAMAGED";
  purchaseDate?: string;
  purchasePrice?: number;
}

export interface UpdateCarPayload {
  color?: string;
  mileage?: number;
  condition?: string;
  purchaseDate?: string;
  purchasePrice?: number;
}

export const carsService = {
  async getAll() {
    const { data } = await apiClient.get("/user-cars");
    return data.data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get(`/user-cars/${id}`);
    return data.data;
  },

  async register(payload: RegisterCarPayload) {
    const { data } = await apiClient.post("/user-cars", payload);
    return data.data;
  },

  async update(id: string, payload: UpdateCarPayload) {
    const { data } = await apiClient.patch(`/user-cars/${id}`, payload);
    return data.data;
  },

  async delete(id: string) {
    const { data } = await apiClient.delete(`/user-cars/${id}`);
    return data.data;
  },

  async hasRegistrationImages(id: string) {
    const { data } = await apiClient.get(`/user-cars/${id}/has-registration-images`);
    return data.data;
  },
};
