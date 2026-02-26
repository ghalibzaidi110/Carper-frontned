import { apiClient } from "@/lib/api-client";

export interface ListingFilters {
  manufacturer?: string;
  modelName?: string;
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  city?: string;
  condition?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface CreateListingPayload {
  carId: string;
  askingPrice: number;
  title: string;
  description?: string;
  isNegotiable?: boolean;
}

export interface UpdateListingPayload {
  title?: string;
  askingPrice?: number;
  description?: string;
  isNegotiable?: boolean;
}

export interface ContactSellerPayload {
  buyerName: string;
  buyerEmail: string;
  message: string;
}

export const listingsService = {
  async browse(params: ListingFilters = {}) {
    const { data } = await apiClient.get("/car-listings", { params });
    // payload = { data: Listing[], meta: {...} }
    return data.data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get(`/car-listings/${id}`);
    return data.data;
  },

  async create(payload: CreateListingPayload) {
    const { data } = await apiClient.post("/car-listings", payload);
    return data.data;
  },

  async getMyListings() {
    const { data } = await apiClient.get("/car-listings/my/listings");
    // payload = array of listings
    return data.data;
  },

  async update(id: string, payload: UpdateListingPayload) {
    const { data } = await apiClient.patch(`/car-listings/${id}`, payload);
    return data.data;
  },

  async updateStatus(id: string, status: string) {
    const { data } = await apiClient.patch(`/car-listings/${id}/status`, { status });
    return data.data;
  },

  async contactSeller(id: string, payload: ContactSellerPayload) {
    const { data } = await apiClient.post(`/car-listings/${id}/contact`, payload);
    return data.data;
  },
};
