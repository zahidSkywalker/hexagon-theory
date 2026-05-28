"use client";

import React from "react";
import Link from "next/link";
import { IdeaListItem } from "@/types";
import { getCategoryColor, formatRelativeTime } from "@/lib/utils";
import { Eye, TrendingUp, Clock } from "lucide-react";

interface IdeaCardProps {
  idea: IdeaListItem;
}

export default function IdeaCard({ idea }: IdeaCardProps) {
  const netVotes = idea.upvote_count - idea.downvote_count;

  return (
    <Link
      href={`/ideas/${idea.slug}`}
      className="group block rounded-xl border border-hexagon-border bg-hexagon-card p-5 transition-all hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5"
    >
      {/* Category & Region */}
      <div className="flex items-start justify-between mb-3">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(
            idea.category
          )}`}
        >
          {idea.category}
        </span>
        {idea.target_region && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            📍 {idea.target_region}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-100 mb-2 line-clamp-2 group-hover:text-primary-400 transition-colors">
        {idea.title}
      </h3>

      {/* Author & Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-3 border-t border-hexagon-border">
        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${idea.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-gray-400 hover:text-primary-400 transition-colors"
          >
            @{idea.author.username}
          </Link>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {idea.view_count}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <TrendingUp
            className={`h-3.5 w-3.5 ${
              netVotes > 0 ? "text-green-500" : netVotes < 0 ? "text-red-500" : "text-gray-500"
            }`}
          />
          <span
            className={`font-semibold ${
              netVotes > 0
                ? "text-green-400"
                : netVotes < 0
                ? "text-red-400"
                : "text-gray-400"
            }`}
          >
            {netVotes > 0 ? `+${netVotes}` : netVotes}
          </span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-600 mt-2 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatRelativeTime(idea.created_at)}
      </div>
    </Link>
  );
}
