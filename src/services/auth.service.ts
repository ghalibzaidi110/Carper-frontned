import { apiClient, setTokens, clearTokens } from "@/lib/api-client";

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  accountType: "INDIVIDUAL" | "CAR_RENTAL";
  phoneNumber: string;
  city: string;
  address: string;
  country?: string;
  postalCode?: string;
  businessName?: string;
  businessLicense?: string;
}

export interface GoogleCompleteSignupPayload {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  accountType: "INDIVIDUAL" | "CAR_RENTAL";
  phoneNumber: string;
  city: string;
  address: string;
  country?: string;
  businessName?: string;
  businessLicense?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  message?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    accountType: string;
    isVerified: boolean;
    phoneNumber?: string;
    city?: string;
    address?: string;
    country?: string;
    avatarUrl?: string;
    googleId?: string;
    [key: string]: unknown;
  };
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(payload: RegisterPayload) {
    try {
      const response = await apiClient.post<{ success: boolean; data: AuthResponse }>("/auth/register", payload);
      const { data } = response;
      
      // Verify response structure
      if (!data?.data) {
        throw new Error("Invalid response format from server");
      }
      
      if (!data.data.accessToken || !data.data.refreshToken) {
        throw new Error("Authentication tokens not received");
      }
      
      setTokens(data.data.accessToken, data.data.refreshToken);
      return data.data;
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Extract error message from API response
      const errorData = error?.response?.data;
      const errorMessage = errorData?.message;
      const statusCode = error?.response?.status;
      
      // Handle validation errors (array of objects with property, value, constraints)
      if (Array.isArray(errorMessage) && errorMessage.length > 0) {
        const formattedErrors = errorMessage
          .map((err: any) => {
            const field = err.property || "field";
            const constraints = err.constraints || {};
            const constraintMessages = Object.values(constraints) as string[];
            
            // Only include if there are actual constraint messages
            if (constraintMessages.length > 0) {
              return `${field}: ${constraintMessages.join(", ")}`;
            }
            return null;
          })
          .filter((msg: string | null) => msg !== null) as string[];
        
        if (formattedErrors.length > 0) {
          throw new Error(formattedErrors.join("; "));
        }
      }
      
      // Handle string error message
      if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
        throw new Error(errorMessage);
      }
      
      // Handle object of field errors (fallback)
      if (typeof errorMessage === "object" && errorMessage !== null && !Array.isArray(errorMessage)) {
        const errors = Object.entries(errorMessage)
          .map(([field, msg]) => {
            if (msg && typeof msg === "string") {
              return `${field}: ${msg}`;
            }
            return null;
          })
          .filter((msg): msg is string => msg !== null);
        
        if (errors.length > 0) {
          throw new Error(errors.join(", "));
        }
      }
      
      // Provide user-friendly error messages based on status code
      if (statusCode === 409) {
        throw new Error("This email or phone number is already registered. Please use a different one or try logging in.");
      }
      
      if (statusCode === 400) {
        throw new Error("Please check your input and make sure all required fields are filled correctly.");
      }
      
      if (statusCode === 401) {
        throw new Error("Authentication failed. Please check your credentials.");
      }
      
      throw new Error(error?.message || "Registration failed. Please try again.");
    }
  },

  async completeGoogleSignup(payload: GoogleCompleteSignupPayload) {
    try {
      const response = await apiClient.post<{ success: boolean; data: AuthResponse }>("/auth/google/complete-signup", payload);
      const { data } = response;
      
      // Verify response structure
      if (!data?.data) {
        throw new Error("Invalid response format from server");
      }
      
      if (!data.data.accessToken || !data.data.refreshToken) {
        throw new Error("Authentication tokens not received");
      }
      
      setTokens(data.data.accessToken, data.data.refreshToken);
      return data.data;
    } catch (error: any) {
      console.error("Google signup error:", error);
      
      // Extract error message from API response
      const errorData = error?.response?.data;
      const errorMessage = errorData?.message;
      const statusCode = error?.response?.status;
      
      // Handle validation errors (array of objects with property, value, constraints)
      if (Array.isArray(errorMessage) && errorMessage.length > 0) {
        const formattedErrors = errorMessage
          .map((err: any) => {
            const field = err.property || "field";
            const constraints = err.constraints || {};
            const constraintMessages = Object.values(constraints) as string[];
            
            // Only include if there are actual constraint messages
            if (constraintMessages.length > 0) {
              return `${field}: ${constraintMessages.join(", ")}`;
            }
            return null;
          })
          .filter((msg: string | null) => msg !== null) as string[];
        
        if (formattedErrors.length > 0) {
          throw new Error(formattedErrors.join("; "));
        }
      }
      
      // Handle string error message
      if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
        throw new Error(errorMessage);
      }
      
      // Handle object of field errors (fallback)
      if (typeof errorMessage === "object" && errorMessage !== null && !Array.isArray(errorMessage)) {
        const errors = Object.entries(errorMessage)
          .map(([field, msg]) => {
            if (msg && typeof msg === "string") {
              return `${field}: ${msg}`;
            }
            return null;
          })
          .filter((msg): msg is string => msg !== null);
        
        if (errors.length > 0) {
          throw new Error(errors.join(", "));
        }
      }
      
      // Provide user-friendly error messages based on status code
      if (statusCode === 409) {
        throw new Error("This email or phone number is already registered. Please use a different one or try logging in.");
      }
      
      if (statusCode === 400) {
        throw new Error("Please check your input and make sure all required fields are filled correctly.");
      }
      
      if (statusCode === 401) {
        throw new Error("Authentication failed. Please check your credentials.");
      }
      
      throw new Error(error?.message || "Google signup failed. Please try again.");
    }
  },

  async login(payload: LoginPayload) {
    try {
      const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>("/auth/login", payload);
      setTokens(data.data.accessToken, data.data.refreshToken);
      return data.data;
    } catch (error: any) {
      // Extract error message from API response
      const errorData = error?.response?.data;
      const errorMessage = errorData?.message;
      const statusCode = error?.response?.status;
      
      // Handle validation errors (array of objects with property, value, constraints)
      if (Array.isArray(errorMessage) && errorMessage.length > 0) {
        const formattedErrors = errorMessage
          .map((err: any) => {
            const field = err.property || "field";
            const constraints = err.constraints || {};
            const constraintMessages = Object.values(constraints) as string[];
            
            // Only include if there are actual constraint messages
            if (constraintMessages.length > 0) {
              return `${field}: ${constraintMessages.join(", ")}`;
            }
            return null;
          })
          .filter((msg: string | null) => msg !== null) as string[];
        
        if (formattedErrors.length > 0) {
          throw new Error(formattedErrors.join("; "));
        }
      }
      
      // Handle string error message
      if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
        throw new Error(errorMessage);
      }
      
      // Handle object of field errors (fallback)
      if (typeof errorMessage === "object" && errorMessage !== null && !Array.isArray(errorMessage)) {
        const errors = Object.entries(errorMessage)
          .map(([field, msg]) => {
            if (msg && typeof msg === "string") {
              return `${field}: ${msg}`;
            }
            return null;
          })
          .filter((msg): msg is string => msg !== null);
        
        if (errors.length > 0) {
          throw new Error(errors.join(", "));
        }
      }
      
      // Provide user-friendly error messages based on status code
      if (statusCode === 401) {
        throw new Error("Invalid email or password. Please check your credentials and try again.");
      }
      
      if (statusCode === 400) {
        throw new Error("Please check your input and make sure all required fields are filled correctly.");
      }
      
      throw new Error(error?.message || "Login failed. Please try again.");
    }
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
