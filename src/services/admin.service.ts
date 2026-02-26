import { apiClient } from "@/lib/api-client";

export interface AdminUsersParams {
  accountType?: string;
  accountStatus?: string;
  isVerified?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminUpdateUserPayload {
  isVerified?: boolean;
  accountStatus?: string;
  accountType?: string;
}

export interface SendNotificationPayload {
  title: string;
  message: string;
  sendToAll?: boolean;
  userIds?: string[];
}

export const adminService = {
  async getUsers(params: AdminUsersParams = {}) {
    const { data } = await apiClient.get("/admin/users", { params });
    // payload = { data: User[], meta: {...} }
    return data.data;
  },

  async getUserById(id: string) {
    const { data } = await apiClient.get(`/admin/users/${id}`);
    return data.data;
  },

  async updateUser(id: string, payload: AdminUpdateUserPayload) {
    const { data } = await apiClient.patch(`/admin/users/${id}`, payload);
    return data.data;
  },

  async getVerifications(params: { page?: number; limit?: number } = {}) {
    const { data } = await apiClient.get("/admin/verifications", { params });
    // payload = { data: User[], meta: {...} }
    return data.data;
  },

  async sendNotification(payload: SendNotificationPayload) {
    const { data } = await apiClient.post("/admin/notifications", payload);
    return data.data;
  },

  async getStats() {
    const { data } = await apiClient.get("/admin/stats");
    // payload = { users: {...}, cars: {...}, listings: {...}, rentals: {...} }
    return data.data;
  },
};
