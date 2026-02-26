import { apiClient, setTokens, clearTokens } from "@/lib/api-client";

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  accountType: "INDIVIDUAL" | "CAR_RENTAL";
  phoneNumber?: string;
  city?: string;
  address?: string;
  country?: string;
  postalCode?: string;
  businessName?: string;
  businessLicense?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    accountType: string;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(payload: RegisterPayload) {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>("/auth/register", payload);
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data;
  },

  async login(payload: LoginPayload) {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>("/auth/login", payload);
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data;
  },

  async getMe() {
    const { data } = await apiClient.get("/auth/me");
    return data.data;
  },

  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearTokens();
    }
  },

  async refresh(refreshToken: string) {
    const { data } = await apiClient.post("/auth/refresh", { refreshToken });
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data;
  },
};
