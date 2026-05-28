import React from "react";

export function IdeaCardSkeleton() {
  return (
    <div className="rounded-xl border border-hexagon-border bg-hexagon-card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 w-24 rounded-full bg-gray-700" />
        <div className="h-4 w-16 bg-gray-700 rounded" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-gray-700 rounded" />
        <div className="h-4 w-3/4 bg-gray-700 rounded" />
      </div>
      <div className="pt-3 border-t border-hexagon-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-16 bg-gray-700 rounded" />
          <div className="h-3 w-10 bg-gray-700 rounded" />
        </div>
        <div className="h-3 w-8 bg-gray-700 rounded" />
      </div>
      <div className="mt-2 h-3 w-20 bg-gray-700 rounded" />
    </div>
  );
}

export function IdeaDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="rounded-xl border border-hexagon-border bg-hexagon-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="h-5 w-24 rounded-full bg-gray-700" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-lg bg-gray-700" />
            <div className="h-8 w-8 rounded-lg bg-gray-700" />
          </div>
        </div>
        <div className="h-8 w-3/4 bg-gray-700 rounded mb-4" />
        <div className="flex items-center gap-4 mb-6">
          <div className="h-4 w-20 bg-gray-700 rounded" />
          <div className="h-4 w-24 bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-700 rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-3/4 bg-gray-700 rounded" />
          <div className="h-4 w-full bg-gray-700 rounded" />
          <div className="h-4 w-2/3 bg-gray-700 rounded" />
          <div className="h-4 w-full bg-gray-700 rounded" />
          <div className="h-4 w-1/2 bg-gray-700 rounded" />
        </div>
      </div>

      {/* Comments skeleton */}
      <div className="rounded-xl border border-hexagon-border bg-hexagon-card p-6">
        <div className="h-7 w-32 bg-gray-700 rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-l-2 border-hexagon-border pl-4 py-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-5 rounded-full bg-gray-700" />
                <div className="h-3 w-20 bg-gray-700 rounded" />
                <div className="h-3 w-16 bg-gray-700 rounded" />
              </div>
              <div className="h-3 w-full bg-gray-700 rounded" />
              <div className="h-3 w-2/3 bg-gray-700 rounded mt-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Profile header */}
      <div className="rounded-xl border border-hexagon-border bg-hexagon-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-gray-700" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-gray-700 rounded" />
            <div className="h-4 w-20 bg-gray-700 rounded" />
          </div>
        </div>
        <div className="h-4 w-full bg-gray-700 rounded" />
        <div className="h-4 w-2/3 bg-gray-700 rounded mt-2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-hexagon-border bg-hexagon-card p-4 text-center"
          >
            <div className="h-8 w-16 bg-gray-700 rounded mx-auto mb-2" />
            <div className="h-3 w-12 bg-gray-700 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Ideas list */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <IdeaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeMap = { sm: "h-5 w-5", md: "h-10 w-10", lg: "h-16 w-16" };
  return (
    <div className="flex justify-center py-20">
      <div
        className={`${sizeMap[size]} border-4 border-gray-700 border-t-primary-500 rounded-full animate-spin`}
      />
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-200 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-gray-400 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
