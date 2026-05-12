"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User } from "@/types";
import { authService, RegisterPayload, GoogleCompleteSignupPayload } from "@/services/auth.service";
import { getAccessToken, getRefreshToken, clearTokens } from "@/lib/api-client";
import { normalizeUser } from "@/lib/normalize";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  completeGoogleSignup: (payload: GoogleCompleteSignupPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  register: async () => false,
  completeGoogleSignup: async () => false,
  logout: async () => {},
  refreshUser: async () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((u: User) => {
    setUser(u);
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_user", JSON.stringify(u));
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const raw = await authService.getMe();
      const normalized = normalizeUser(raw);
      persistUser(normalized);
    } catch {
      setUser(null);
      clearTokens();
    }
  }, [persistUser]);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken && !refreshToken) {
        clearTokens();
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        if (!accessToken && refreshToken) {
          await authService.refresh(refreshToken);
        }
        const raw = await authService.getMe();
        const normalized = normalizeUser(raw);
        if (!cancelled) {
          persistUser(normalized);
        }
      } catch {
        clearTokens();
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [persistUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await authService.login({ email, password });
      const normalized = normalizeUser(result.user);
      persistUser(normalized);
      return true;
    } catch (error: any) {
      // Re-throw error with message so the component can display it
      throw error;
    }
  }, [persistUser]);

  const register = useCallback(async (payload: RegisterPayload) => {
    try {
      const result = await authService.register(payload);
      const normalized = normalizeUser(result.user);
      persistUser(normalized);
      return true;
    } catch (error: any) {
      // Re-throw error with message so the component can display it
      throw error;
    }
  }, [persistUser]);

  const completeGoogleSignup = useCallback(async (payload: GoogleCompleteSignupPayload) => {
    try {
      const result = await authService.completeGoogleSignup(payload);
      const normalized = normalizeUser(result.user);
      persistUser(normalized);
      return true;
    } catch (error: any) {
      // Re-throw error with message so the component can display it
      throw error;
    }
  }, [persistUser]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      clearTokens();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, completeGoogleSignup, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
