import Link from "next/link";
import { Hexagon, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <div className="relative mb-6">
        <Hexagon className="h-24 w-24 text-gray-700" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-gray-500">
          404
        </span>
      </div>
      <h1 className="text-3xl font-bold text-gray-200 mb-3">Page Not Found</h1>
      <p className="text-gray-400 mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="btn btn-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Home
        </Link>
        <Link href="/ideas" className="btn btn-ghost">
          Browse Ideas
        </Link>
      </div>
    </div>
  );
}
