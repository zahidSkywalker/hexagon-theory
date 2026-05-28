"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";
import { VoteSummary } from "@/types";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";

interface VoteButtonProps {
  ideaId: string;
  voteSummary: VoteSummary | null;
  onVoteUpdate: (summary: VoteSummary) => void;
}

export default function VoteButton({ ideaId, voteSummary, onVoteUpdate }: VoteButtonProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleVote = async (voteType: "upvote" | "downvote") => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    try {
      if (voteSummary?.user_vote === voteType) {
        await api.votes.remove(ideaId);
      } else {
        await api.votes.cast(ideaId, voteType);
      }

      const response = await api.votes.getSummary(ideaId);
      onVoteUpdate(response.data);
    } catch (err) {
      console.error("Error voting:", err);
      showToast("Failed to record vote. Please try again.", "error");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote("upvote")}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          voteSummary?.user_vote === "upvote"
            ? "bg-green-500/20 text-green-400 border border-green-500/30"
            : "bg-hexagon-darker text-gray-400 border border-hexagon-border hover:border-green-500/30 hover:text-green-400"
        }`}
        title="Upvote"
      >
        <ArrowUp className="h-4 w-4" />
        <span>{voteSummary?.upvote_count || 0}</span>
      </button>

      <div className="text-center min-w-[48px]">
        <div
          className={`text-2xl font-bold ${
            (voteSummary?.net_votes || 0) > 0
              ? "text-green-400"
              : (voteSummary?.net_votes || 0) < 0
              ? "text-red-400"
              : "text-gray-400"
          }`}
        >
          {voteSummary?.net_votes || 0}
        </div>
      </div>

      <button
        onClick={() => handleVote("downvote")}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          voteSummary?.user_vote === "downvote"
            ? "bg-red-500/20 text-red-400 border border-red-500/30"
            : "bg-hexagon-darker text-gray-400 border border-hexagon-border hover:border-red-500/30 hover:text-red-400"
        }`}
        title="Downvote"
      >
        <ArrowDown className="h-4 w-4" />
        <span>{voteSummary?.downvote_count || 0}</span>
      </button>
    </div>
  );
}
