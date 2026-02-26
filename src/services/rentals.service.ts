import { apiClient } from "@/lib/api-client";

export interface CreateRentalPayload {
  carId: string;
  renterName: string;
  renterPhone: string;
  renterEmail?: string;
  renterCnic?: string;
  startDate: string;
  endDate: string;
  mileageAtStart?: number;
  rentalPrice: number;
  preRentalNotes?: string;
}

export interface CompleteRentalPayload {
  mileageAtEnd?: number;
  postRentalNotes?: string;
  damageCharges?: number;
  damageDescription?: string;
  totalCharges?: number;
}

export interface RentalFilters {
  status?: string;
  carId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export const rentalsService = {
  async create(payload: CreateRentalPayload) {
    const { data } = await apiClient.post("/rentals", payload);
    return data.data;
  },

  async getAll(params: RentalFilters = {}) {
    const { data } = await apiClient.get("/rentals", { params });
    // payload = { data: Rental[], meta: {...} }
    return data.data;
  },

  async getStats() {
    const { data } = await apiClient.get("/rentals/stats");
    // payload = { activeRentals, completedRentals, totalRentals, totalRevenue }
    return data.data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get(`/rentals/${id}`);
    return data.data;
  },

  async complete(id: string, payload: CompleteRentalPayload) {
    const { data } = await apiClient.patch(`/rentals/${id}/complete`, payload);
    return data.data;
  },

  async cancel(id: string) {
    const { data } = await apiClient.patch(`/rentals/${id}/cancel`);
    return data.data;
  },
};
