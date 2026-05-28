import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to readable string.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals: Record<string, number> = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
}

/**
 * Truncate text to specified length.
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

/**
 * Format file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Get category color — returns proper Tailwind classes.
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Infrastructure: "bg-blue-100 text-blue-800",
    Health: "bg-red-100 text-red-800",
    Education: "bg-green-100 text-green-800",
    Technology: "bg-purple-100 text-purple-800",
    Economy: "bg-yellow-100 text-yellow-800",
    Social: "bg-pink-100 text-pink-800",
    Environment: "bg-emerald-100 text-emerald-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
}

/**
 * Get status color — returns proper Tailwind classes.
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-red-100 text-red-800",
    interested: "bg-blue-100 text-blue-800",
    under_review: "bg-yellow-100 text-yellow-800",
    implemented: "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

/**
 * Get role badge color.
 */
export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    user: "bg-gray-100 text-gray-700",
    moderator: "bg-amber-100 text-amber-800",
    institution: "bg-indigo-100 text-indigo-800",
  };
  return colors[role] || "bg-gray-100 text-gray-700";
}

/**
 * Generate a simple unique id (for toast keys, etc.).
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
