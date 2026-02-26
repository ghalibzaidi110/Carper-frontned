import { apiClient } from "@/lib/api-client";

export interface CatalogFilters {
  manufacturer?: string;
  modelName?: string;
  yearFrom?: number;
  yearTo?: number;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  page?: number;
  limit?: number;
}

export interface CreateCatalogPayload {
  manufacturer: string;
  modelName: string;
  year: number;
  variant?: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  engineCapacity?: string;
  seatingCapacity?: number;
  basePrice?: number;
  description?: string;
  features?: string[];
}

export const catalogService = {
  async browse(params: CatalogFilters = {}) {
    const { data } = await apiClient.get("/car-catalog", { params });
    // payload = { data: CarCatalog[], meta: {...} }
    return data.data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get(`/car-catalog/${id}`);
    return data.data;
  },

  async getManufacturers() {
    const { data } = await apiClient.get("/car-catalog/manufacturers");
    // payload = ["Toyota", "Honda", ...] (array of strings)
    return data.data;
  },

  async getModelsByManufacturer(manufacturer: string) {
    const { data } = await apiClient.get(`/car-catalog/manufacturers/${encodeURIComponent(manufacturer)}/models`);
    // payload = [{ modelName, years[], variants[] }, ...]
    return data.data;
  },

  async create(payload: CreateCatalogPayload) {
    const { data } = await apiClient.post("/car-catalog", payload);
    return data.data;
  },

  async bulkCreate(entries: CreateCatalogPayload[]) {
    const { data } = await apiClient.post("/car-catalog/bulk", entries);
    return data.data;
  },

  async update(id: string, payload: Partial<CreateCatalogPayload>) {
    const { data } = await apiClient.patch(`/car-catalog/${id}`, payload);
    return data.data;
  },

  async delete(id: string) {
    const { data } = await apiClient.delete(`/car-catalog/${id}`);
    return data.data;
  },

  async uploadImage(id: string, file: File, isPrimary: boolean = false, altText?: string) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("isPrimary", String(isPrimary));
    if (altText) formData.append("altText", altText);
    const { data } = await apiClient.post(`/car-catalog/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },
};
