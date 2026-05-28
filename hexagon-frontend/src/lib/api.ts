/**
 * API client for backend communication.
 * Handles authentication, request/response intercepting, and error handling.
 * All IDs are strings (MongoDB ObjectId.toString()).
 */

import axios, { AxiosInstance, AxiosError } from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

// Create axios instance — empty baseURL means relative to current origin (Next.js API routes)
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL || undefined,
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
// Routes restructured to avoid Next.js catch-all conflicts:
//   /api/votes (POST/DELETE) + /api/votes/summary (GET)
//   /api/comments (GET/POST) + /api/comments/[commentId] (PUT/DELETE)
//   /api/institutional/interests (GET/POST/PUT/DELETE)
//   /api/institutional/dashboard (GET)
// ─────────────────────────────────────────────────────────────
export const api = {
  // Auth
  auth: {
    register: (data: {
      email: string;
      username: string;
      password: string;
      full_name?: string;
    }) => apiClient.post("/api/auth/register", data),

    login: (data: { email: string; password: string }) =>
      apiClient.post("/api/auth/login", data),

    getMe: () => apiClient.get("/api/auth/me"),
  },

  // Users
  users: {
    getProfile: (username: string) =>
      apiClient.get(`/api/users/${username}`),

    getOwnProfile: () => apiClient.get("/api/users/me"),

    updateProfile: (data: {
      full_name?: string;
      bio?: string;
      avatar_url?: string;
    }) => apiClient.put("/api/users/me", data),
  },

  // Ideas
  ideas: {
    list: (params?: {
      category?: string;
      status?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }) => apiClient.get("/api/ideas", { params }),

    search: (query: string, params?: { limit?: number; offset?: number }) =>
      apiClient.get("/api/ideas/search", { params: { q: query, ...params } }),

    get: (slug: string) => apiClient.get(`/api/ideas/${slug}`),

    create: (data: Record<string, unknown>) =>
      apiClient.post("/api/ideas", data),

    update: (slug: string, data: Record<string, unknown>) =>
      apiClient.put(`/api/ideas/${slug}`, data),

    delete: (slug: string) => apiClient.delete(`/api/ideas/${slug}`),

    uploadFile: (slug: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post(`/api/ideas/${slug}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },

    getVersions: (slug: string) => apiClient.get(`/api/ideas/${slug}/versions`),
  },

  // Votes — idea_id is a string (ObjectId)
  // Restructured: POST/DELETE /api/votes, GET /api/votes/summary?idea_id=xxx
  votes: {
    cast: (ideaId: string, voteType: "upvote" | "downvote") =>
      apiClient.post("/api/votes", { idea_id: ideaId, vote_type: voteType }),

    remove: (ideaId: string) =>
      apiClient.delete("/api/votes", { data: { idea_id: ideaId } }),

    getSummary: (ideaId: string) =>
      apiClient.get("/api/votes/summary", { params: { idea_id: ideaId } }),
  },

  // Comments — idea_id and comment_id are strings
  // Restructured: GET/POST /api/comments, PUT/DELETE /api/comments/[commentId]
  comments: {
    list: (ideaId: string, isSuggestion?: boolean) =>
      apiClient.get("/api/comments", {
        params: { idea_id: ideaId, is_suggestion: isSuggestion },
      }),

    create: (
      ideaId: string,
      data: { content: string; parent_id?: string; is_suggestion?: boolean }
    ) => apiClient.post("/api/comments", { idea_id: ideaId, ...data }),

    update: (ideaId: string, commentId: string, content: string) =>
      apiClient.put(`/api/comments/${commentId}`, { content }),

    delete: (ideaId: string, commentId: string) =>
      apiClient.delete(`/api/comments/${commentId}`),
  },

  // Institutional
  // Restructured: /api/institutional/interests (GET/POST/PUT/DELETE), /api/institutional/dashboard (GET)
  institutional: {
    getInterests: (ideaId: string) =>
      apiClient.get("/api/institutional/interests", { params: { idea_id: ideaId } }),

    markInterest: (
      ideaId: string,
      data: { status: string; notes?: string }
    ) => apiClient.post("/api/institutional/interests", { idea_id: ideaId, ...data }),

    updateInterest: (ideaId: string, data: { status?: string; notes?: string }) =>
      apiClient.put("/api/institutional/interests", { idea_id: ideaId, ...data }),

    removeInterest: (ideaId: string) =>
      apiClient.delete("/api/institutional/interests", { data: { idea_id: ideaId } }),

    getDashboard: () => apiClient.get("/api/institutional/dashboard"),
  },
};
