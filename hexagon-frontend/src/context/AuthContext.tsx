/**
 * Authentication context provider.
 * Manages user authentication state, login, logout, and token storage.
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { User, TokenResponse } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    full_name?: string
  ) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const response = await api.auth.getMe();
        setUser(response.data);
      } catch {
        localStorage.removeItem("access_token");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const response = await api.auth.login({ email, password });
    const tokenData: TokenResponse = response.data;
    localStorage.setItem("access_token", tokenData.access_token);
    const userResponse = await api.auth.getMe();
    setUser(userResponse.data);
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    full_name?: string
  ) => {
    await api.auth.register({ email, username, password, full_name });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.auth.getMe();
      setUser(response.data);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
