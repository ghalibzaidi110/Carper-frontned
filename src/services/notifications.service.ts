import { apiClient } from "@/lib/api-client";

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

export const notificationsService = {
  async getAll(params: NotificationFilters = {}) {
    const { data } = await apiClient.get("/notifications", { params });
    // payload = { data: Notification[], unreadCount: number, meta: {...} }
    return data.data;
  },

  async getUnreadCount() {
    const { data } = await apiClient.get("/notifications/unread-count");
    // payload = { unreadCount: number }
    return data.data;
  },

  async markAsRead(id: string) {
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data.data;
  },

  async markAllAsRead() {
    const { data } = await apiClient.patch("/notifications/read-all");
    return data.data;
  },

  async delete(id: string) {
    const { data } = await apiClient.delete(`/notifications/${id}`);
    return data.data;
  },
};
