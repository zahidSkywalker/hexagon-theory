"use client";

import { useEffect } from "react";
import { Hexagon, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="relative inline-block mb-6">
          <Hexagon className="h-20 w-20 text-primary-500/20" />
          <span className="absolute inset-0 flex items-center justify-center text-3xl">
            ⚠️
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-100 mb-3">
          Something went wrong
        </h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          An unexpected error occurred. This has been logged for review.
          Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
