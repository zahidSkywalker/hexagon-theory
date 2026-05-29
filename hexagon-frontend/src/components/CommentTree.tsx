"use client";

import React, { useState } from "react";
import { Comment, Idea } from "@/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { MessageCircle, ChevronDown, ChevronUp, Reply, Send } from "lucide-react";
import { api } from "@/lib/api";

interface CommentTreeProps {
  comments: Comment[];
  idea: Idea;
  activeTab: "discussion" | "suggestions";
  onUpdate: () => void;
}

function CommentItem({
  comment,
  idea,
  depth,
  onUpdate,
}: {
  comment: Comment;
  idea: Idea;
  depth: number;
  onUpdate: () => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);

  const isOwner = user?.id === comment.user_id;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !isAuthenticated) return;
    setReplying(true);
    try {
      await api.comments.create(idea.id, {
        content: replyContent,
        parent_id: comment.id,
        is_suggestion: comment.is_suggestion,
      });
      setReplyContent("");
      setReplyOpen(false);
      onUpdate();
    } catch (err) {
      console.error("Error posting reply:", err);
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className={`${depth > 0 ? "ml-6 border-l border-hexagon-border pl-4" : ""}`}>
      <div className="py-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-6 w-6 rounded-full bg-primary-700 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {comment.user.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-gray-200">
            @{comment.user.username}
          </span>
          <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
          {comment.is_edited && (
            <span className="text-[10px] text-gray-500 italic">(edited)</span>
          )}
          {comment.is_suggestion && (
            <span className="text-[10px] bg-secondary-500/20 text-secondary-400 px-2 py-0.5 rounded-full">
              Suggestion
            </span>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-2">
          {isAuthenticated && (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  router.push("/login");
                  return;
                }
                setReplyOpen(!replyOpen);
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-400 transition-colors"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          )}
        </div>

        {/* Reply Form */}
        {replyOpen && (
          <form onSubmit={handleReply} className="mt-3 ml-6">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="w-full bg-hexagon-darker border border-hexagon-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white hover:bg-primary-500 transition-colors disabled:opacity-50"
                disabled={!replyContent.trim() || replying}
              >
                <Send className="h-3 w-3" />
                Reply
              </button>
              <button
                type="button"
                onClick={() => setReplyOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              idea={idea}
              depth={depth + 1}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentTree({ comments, idea, activeTab, onUpdate }: CommentTreeProps) {
  const [expanded, setExpanded] = useState(true);

  // If comments already have nested replies[] from API, use them directly
  // Only filter top-level comments by tab, then recursively filter nested replies
  const isTopLevel = (c: Comment) => !c.parent_id;
  const topComments = comments.filter(isTopLevel);

  const filterByTab = (comment: Comment): Comment => {
    const shouldInclude = activeTab === "suggestions" ? comment.is_suggestion : !comment.is_suggestion;
    const filteredReplies = (comment.replies || []).map(filterByTab).filter(Boolean);
    if (!shouldInclude && filteredReplies.length === 0) {
      return null as unknown as Comment;
    }
    // If this comment doesn't match the tab but has matching replies, still show it as a container
    return { ...comment, replies: filteredReplies };
  };

  const filtered = topComments.map(filterByTab).filter(Boolean);

  // If no nested replies from API, fall back to flat tree building
  const hasNestedReplies = comments.some(c => c.replies && c.replies.length > 0 && isTopLevel(c));
  let tree: Comment[];

  if (hasNestedReplies) {
    tree = filtered;
  } else {
    // Legacy fallback: build tree from flat array
    const filteredFlat = comments.filter((c) =>
      activeTab === "suggestions" ? c.is_suggestion : !c.is_suggestion
    );
    const commentMap = new Map<string, Comment>();
    filteredFlat.forEach((c) => commentMap.set(c.id, c));

    const rootComments = filteredFlat.filter(
      (c) => !c.parent_id || !commentMap.has(c.parent_id)
    );

    const buildTree = (comment: Comment): Comment => {
      const replies = filteredFlat.filter((c) => c.parent_id === comment.id);
      return { ...comment, replies: replies.map(buildTree) };
    };

    tree = rootComments.map(buildTree);
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-10">
        <MessageCircle className="h-10 w-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500">
          No {activeTab === "suggestions" ? "suggestions" : "comments"} yet.
          Be the first!
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-3"
      >
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {tree.length} {activeTab === "suggestions" ? "suggestion" : "comment"}
        {tree.length !== 1 ? "s" : ""}
      </button>

      {expanded && (
        <div className="divide-y divide-hexagon-border/50">
          {tree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              idea={idea}
              depth={0}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
