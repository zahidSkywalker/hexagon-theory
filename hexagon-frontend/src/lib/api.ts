/**
 * API client for backend communication.
 * Handles authentication, request/response intercepting, and error handling.
 * All IDs are strings (MongoDB ObjectId.toString()).
 */

import axios, { AxiosInstance, AxiosError } from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        // Only redirect if not already on login page
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ─────────────────────────────────────────────────────────────
// Typed API methods — all idea_id / comment_id / user_id are strings
// ─────────────────────────────────────────────────────────────
export const api = {
  // Auth
  auth: {
    register: (data: {
      email: string;
      username: string;
      password: string;
      full_name?: string;
    }) => apiClient.post("/auth/register", data),

    login: (data: { email: string; password: string }) =>
      apiClient.post("/auth/login", data),

    getMe: () => apiClient.get("/auth/me"),
  },

  // Users
  users: {
    getProfile: (username: string) =>
      apiClient.get(`/users/${username}`),

    getOwnProfile: () => apiClient.get("/users/me"),

    updateProfile: (data: {
      full_name?: string;
      bio?: string;
      avatar_url?: string;
    }) => apiClient.put("/users/me", data),
  },

  // Ideas
  ideas: {
    list: (params?: {
      category?: string;
      region?: string;
      sort_by?: string;
      limit?: number;
      offset?: number;
    }) => apiClient.get("/ideas", { params }),

    search: (query: string, params?: { limit?: number; offset?: number }) =>
      apiClient.get("/ideas/search", { params: { q: query, ...params } }),

    get: (slug: string) => apiClient.get(`/ideas/${slug}`),

    create: (data: Record<string, unknown>) =>
      apiClient.post("/ideas", data),

    update: (slug: string, data: Record<string, unknown>) =>
      apiClient.put(`/ideas/${slug}`, data),

    delete: (slug: string) => apiClient.delete(`/ideas/${slug}`),

    uploadFile: (slug: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post(`/ideas/${slug}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },

    getVersions: (slug: string) => apiClient.get(`/ideas/${slug}/versions`),
  },

  // Votes — idea_id is a string (ObjectId)
  votes: {
    cast: (ideaId: string, voteType: "upvote" | "downvote") =>
      apiClient.post(`/ideas/${ideaId}/votes`, { vote_type: voteType }),

    remove: (ideaId: string) => apiClient.delete(`/ideas/${ideaId}/votes`),

    getSummary: (ideaId: string) =>
      apiClient.get(`/ideas/${ideaId}/votes/summary`),
  },

  // Comments — idea_id and comment_id are strings
  comments: {
    list: (ideaId: string, isSuggestion?: boolean) =>
      apiClient.get(`/ideas/${ideaId}/comments`, {
        params: { is_suggestion: isSuggestion },
      }),

    create: (
      ideaId: string,
      data: { content: string; parent_id?: string; is_suggestion?: boolean }
    ) => apiClient.post(`/ideas/${ideaId}/comments`, data),

    update: (ideaId: string, commentId: string, content: string) =>
      apiClient.put(`/ideas/${ideaId}/comments/${commentId}`, { content }),

    delete: (ideaId: string, commentId: string) =>
      apiClient.delete(`/ideas/${ideaId}/comments/${commentId}`),
  },

  // Institutional
  institutional: {
    getInterests: (ideaId: string) =>
      apiClient.get(`/institutional/ideas/${ideaId}/interests`),

    markInterest: (
      ideaId: string,
      data: { status: string; notes?: string }
    ) => apiClient.post(`/institutional/ideas/${ideaId}/interests`, data),

    updateInterest: (ideaId: string, data: { status?: string; notes?: string }) =>
      apiClient.put(`/institutional/ideas/${ideaId}/interests`, data),

    removeInterest: (ideaId: string) =>
      apiClient.delete(`/institutional/ideas/${ideaId}/interests`),

    getDashboard: () => apiClient.get("/institutional/dashboard"),
  },
};
