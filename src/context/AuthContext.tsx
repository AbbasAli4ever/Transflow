"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  apiRequest,
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  ApiError,
} from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  role: "OWNER" | "ADMIN" | "USER";
  tenant?: {
    id: string;
    name: string;
    baseCurrency: string;
    timezone: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    tenantName: string,
    fullName: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── API response shapes ──────────────────────────────────────────────────────

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const accessToken = getAccessToken();
    if (stored && accessToken) {
      try {
        setUser(JSON.parse(stored));
        // Ensure the middleware cookie is present on page refresh
        document.cookie =
          "isLoggedIn=true; path=/; max-age=604800; SameSite=Lax";
      } catch {
        clearTokens();
        document.cookie = "isLoggedIn=; path=/; max-age=0; SameSite=Lax";
      }
    }
    setIsLoading(false);
  }, []);

  // ── Cookie helpers for middleware ──────────────────────────────────────────
  function setLoggedInCookie() {
    // Expires in 7 days (matches refresh token lifetime)
    document.cookie =
      "isLoggedIn=true; path=/; max-age=604800; SameSite=Lax";
  }

  function clearLoggedInCookie() {
    document.cookie =
      "isLoggedIn=; path=/; max-age=0; SameSite=Lax";
  }

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    setLoggedInCookie();
    setUser(data.user);
    window.location.href = "/";
  }, []);

  const register = useCallback(
    async (
      tenantName: string,
      fullName: string,
      email: string,
      password: string
    ) => {
      const data = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ tenantName, fullName, email, password }),
      });
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      setLoggedInCookie();
      setUser(data.user);
      window.location.href = "/";
    },
    []
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiRequest("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Proceed with local logout even if server call fails
      }
    }
    clearTokens();
    clearLoggedInCookie();
    setUser(null);
    window.location.href = "/signin";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && !!getAccessToken(),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
