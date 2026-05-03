import { apiClient } from "@/lib/api-client";

export interface UpdateProfilePayload {
  fullName?: string;
  phoneNumber?: string;
  city?: string;
  address?: string;
  country?: string;
  postalCode?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const usersService = {
  async getProfile() {
    const { data } = await apiClient.get("/users/profile");
    return data.data;
  },

  async updateProfile(payload: UpdateProfilePayload) {
    try {
      const { data } = await apiClient.patch("/users/profile", payload);
      return data.data;
    } catch (error: any) {
      const errorData = error?.response?.data;
      const raw = errorData?.message;
      let message: string;
      if (Array.isArray(raw)) {
        message = raw
          .map((err: any) =>
            typeof err === "string"
              ? err
              : Object.values(err?.constraints || {}).join(", "),
          )
          .filter(Boolean)
          .join("; ");
      } else {
        message = typeof raw === "string" ? raw : "Failed to update profile";
      }
      throw new Error(message || "Failed to update profile");
    }
  },

  async changePassword(payload: ChangePasswordPayload) {
    try {
      const { data } = await apiClient.post("/users/change-password", payload);
      return data.data;
    } catch (error: any) {
      const errorData = error?.response?.data;
      const raw = errorData?.message;
      let message: string;
      if (Array.isArray(raw)) {
        message = raw
          .map((err: any) =>
            typeof err === "string"
              ? err
              : Object.values(err?.constraints || {}).join(", "),
          )
          .filter(Boolean)
          .join("; ");
      } else {
        message = typeof raw === "string" ? raw : "Failed to change password";
      }
      throw new Error(message || "Failed to change password");
    }
  },

  async uploadCnic(file: File) {
    const formData = new FormData();
    formData.append("cnic", file);
    const { data } = await apiClient.post("/users/upload-cnic", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("avatar", file);
    const { data } = await apiClient.post("/users/upload-avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async getDashboard() {
    const { data } = await apiClient.get("/users/dashboard");
    return data.data;
  },
};
