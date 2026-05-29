"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { IdeaListItem } from "@/types";
import { api } from "@/lib/api";
import IdeaCard from "@/components/IdeaCard";
import {
  IdeaCardSkeleton,
  ErrorState,
  Spinner,
} from "@/components/LoadingSkeleton";
import { Search, SlidersHorizontal, Plus, X } from "lucide-react";

const CATEGORIES = [
  "All",
  "Infrastructure",
  "Health",
  "Education",
  "Technology",
  "Economy",
  "Social",
  "Environment",
];

const PAGE_SIZE = 24;

export default function IdeasPage() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category") || "All";

  const [ideas, setIdeas] = useState<IdeaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(urlCategory);
  const [sortBy, setSortBy] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchIdeas = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : offset;
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const params: Record<string, unknown> = {
          sort: sortBy,
          limit: PAGE_SIZE,
          offset: currentOffset,
        };
        if (category !== "All") params.category = category;

        if (searchQuery.trim()) {
          const response = await api.ideas.search(searchQuery, {
            limit: PAGE_SIZE,
            offset: currentOffset,
          });
          const data = response.data;
          const items = Array.isArray(data) ? data : (data as { ideas?: IdeaListItem[] }).ideas || [];
          setIdeas(reset ? items : (prev) => [...prev, ...items]);
          setHasMore(items.length === PAGE_SIZE);
        } else {
          const response = await api.ideas.list(
            params as { category?: string; status?: string; sort?: string; limit?: number; offset?: number }
          );
          const data = response.data;
          const items = Array.isArray(data) ? data : (data as { ideas?: IdeaListItem[] }).ideas || [];
          setIdeas(reset ? items : (prev) => [...prev, ...items]);
          setHasMore(items.length === PAGE_SIZE);
        }

        setOffset(currentOffset + PAGE_SIZE);
      } catch (err) {
        console.error("Error fetching ideas:", err);
        setError("Failed to load ideas. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, sortBy, offset, searchQuery]
  );

  // Sync URL category param
  useEffect(() => {
    if (urlCategory !== category) {
      setCategory(urlCategory);
      setOffset(0);
    }
  }, [urlCategory]);

  useEffect(() => {
    fetchIdeas(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sortBy]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchIdeas(true);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setOffset(0);
    setHasMore(true);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setOffset(0);
    setHasMore(true);
  };

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b border-hexagon-border bg-hexagon-card/30">
        <div className="container-custom py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
                Browse Ideas
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Discover innovative solutions for global challenges
              </p>
            </div>
            <Link href="/ideas/new" className="btn btn-primary flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Submit Idea
            </Link>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas by title, keyword, or region..."
              className="input pl-12 pr-12 py-3.5 text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setOffset(0);
                  fetchIdeas(true);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    category === cat
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                      : "bg-hexagon-card border border-hexagon-border text-gray-400 hover:text-gray-200 hover:border-gray-500"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-hexagon-card border border-hexagon-border rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="trending">Trending</option>
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ideas Grid */}
        {error ? (
          <ErrorState message={error} onRetry={() => fetchIdeas(true)} />
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <IdeaCardSkeleton key={i} />
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-20">
            <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No ideas found</p>
            <p className="text-gray-500 text-sm mb-6">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "No ideas in this category yet"}
            </p>
            <Link href="/ideas/new" className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Be the First to Submit
            </Link>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => fetchIdeas(false)}
                  className="btn btn-outline px-8"
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <div className="spinner h-4 w-4 mr-2" />
                  ) : null}
                  {loadingMore ? "Loading..." : "Load More Ideas"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
