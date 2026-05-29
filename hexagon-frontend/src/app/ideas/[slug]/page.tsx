"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Idea, Comment, VoteSummary } from "@/types";
import { api } from "@/lib/api";
import {
  formatDate,
  formatFileSize,
  getCategoryColor,
} from "@/lib/utils";
import { IdeaDetailSkeleton, ErrorState } from "@/components/LoadingSkeleton";
import VoteButton from "@/components/VoteButton";
import CommentTree from "@/components/CommentTree";
import { useToast } from "@/components/Toast";
import {
  Clock,
  Eye,
  User,
  FileText,
  Share2,
  Flag,
  Edit,
  Trash2,
  Send,
  MapPin,
  Tag,
  Play,
} from "lucide-react";

export default function IdeaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<"discussion" | "suggestions">(
    "discussion"
  );

  const fetchIdea = useCallback(async () => {
    if (!params.slug) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch the idea by slug first
      const ideaRes = await api.ideas.get(params.slug as string);
      const ideaData: Idea = ideaRes.data;
      setIdea(ideaData);

      // Step 2: Now use the idea's numeric-compatible ID for votes and comments
      // The backend accepts string IDs from MongoDB ObjectId.toString()
      const ideaId = ideaData.id;

      const [voteRes, commentsRes] = await Promise.all([
        api.votes.getSummary(ideaId), // FIXED: use idea.id, not Number(params.slug)
        api.comments.list(ideaId),
      ]);

      setVoteSummary(voteRes.data);
      // Handle comment response: API returns {comments:[], total:N}
      const commentsData = commentsRes.data;
      setComments(Array.isArray(commentsData) ? commentsData : (commentsData as { comments?: unknown[] }).comments || []);
    } catch (err: unknown) {
      console.error("Error fetching idea:", err);
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        setError("This idea could not be found.");
      } else {
        setError("Failed to load idea. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    fetchIdea();
  }, [fetchIdea]);

  const fetchComments = useCallback(async () => {
    if (!idea) return;
    try {
      const response = await api.comments.list(idea.id);
      const data = response.data;
      setComments(Array.isArray(data) ? data : (data as { comments?: unknown[] }).comments || []);
    } catch (err) {
      console.error("Error refreshing comments:", err);
    }
  }, [idea]);

  const handleVoteUpdate = useCallback((summary: VoteSummary) => {
    setVoteSummary(summary);
  }, []);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !isAuthenticated || !idea) return;

    setSubmittingComment(true);
    try {
      await api.comments.create(idea.id, {
        content: commentContent,
        is_suggestion: activeTab === "suggestions",
      });
      setCommentContent("");
      showToast(
        activeTab === "suggestions"
          ? "Suggestion posted!"
          : "Comment posted!",
        "success"
      );
      await fetchComments();
    } catch (err) {
      console.error("Error posting comment:", err);
      showToast("Failed to post comment. Please try again.", "error");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    if (!idea) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!", "success");
    } catch {
      showToast("Could not copy link.", "error");
    }
  };

  const handleDelete = async () => {
    if (!idea) return;
    if (!window.confirm("Are you sure you want to delete this idea? This action cannot be undone.")) return;

    try {
      await api.ideas.delete(idea.slug);
      showToast("Idea deleted.", "success");
      router.push("/ideas");
    } catch (err) {
      console.error("Error deleting idea:", err);
      showToast("Failed to delete idea.", "error");
    }
  };

  if (loading) {
    return (
      <div className="container-custom py-8">
        <IdeaDetailSkeleton />
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="container-custom py-8">
        <ErrorState
          message={error || "Idea not found"}
          onRetry={fetchIdea}
        />
      </div>
    );
  }

  // Guard against missing author data (e.g. deleted user)
  const author = idea.author || { id: '', username: 'unknown', full_name: null, avatar_url: null, role: 'user' };
  const isOwner = user?.id === idea.user_id;

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-hexagon-border bg-hexagon-card/30">
        <div className="container-custom py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/ideas"
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              Ideas
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300 truncate max-w-md">{idea.title}</span>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Idea Card */}
            <div className="card">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`badge ${getCategoryColor(idea.category)}`}
                  >
                    {idea.category}
                  </span>
                  <span
                    className={`badge ${
                      idea.status === "published"
                        ? "bg-green-500/10 text-green-400"
                        : idea.status === "draft"
                        ? "bg-gray-500/10 text-gray-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {idea.status}
                  </span>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm">
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Edit</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="btn btn-ghost btn-sm text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-100 mb-4 leading-tight">
                {idea.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary-700 flex items-center justify-center text-white text-[10px] font-bold">
                    {author.username.charAt(0).toUpperCase()}
                  </div>
                  <Link
                    href={`/profile/${author.username}`}
                    className="font-medium text-gray-300 hover:text-primary-400 transition-colors"
                  >
                    @{author.username}
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(idea.created_at)}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {idea.view_count.toLocaleString()} views
                </div>
                {idea.target_region && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {idea.target_region}
                  </div>
                )}
              </div>

              {/* Video embed */}
              {idea.video_url && (
                <div className="mb-6 rounded-xl overflow-hidden border border-hexagon-border">
                  <div className="aspect-video bg-hexagon-darker flex items-center justify-center">
                    <a
                      href={idea.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Watch Video
                    </a>
                  </div>
                </div>
              )}

              {/* Problem Statement */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-400" />
                  Problem Statement
                </h2>
                <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                  {idea.problem_statement}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <Edit className="h-5 w-5 text-primary-400" />
                  Proposed Solution
                </h2>
                <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                  {idea.description}
                </div>
              </div>

              {/* Expected Impact */}
              {idea.expected_impact && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-green-400" />
                    Expected Impact
                  </h2>
                  <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                    {idea.expected_impact}
                  </div>
                </div>
              )}

              {/* Cost-Benefit */}
              {idea.cost_benefit_summary && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                    💰 Cost-Benefit Summary
                  </h2>
                  <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                    {idea.cost_benefit_summary}
                  </div>
                </div>
              )}

              {/* Target Community */}
              {idea.target_community && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-yellow-400" />
                    Target Community
                  </h2>
                  <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                    {idea.target_community}
                  </div>
                </div>
              )}

              {/* Files */}
              {idea.files.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-100 mb-3">
                    Attachments ({idea.files.length})
                  </h2>
                  <div className="space-y-2">
                    {idea.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 border border-hexagon-border rounded-lg bg-hexagon-darker hover:border-gray-500 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-200">
                              {file.file_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(file.file_size)}
                            </div>
                          </div>
                        </div>
                        <button className="btn btn-outline btn-sm">Download</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-100">Discussion</h2>
                <div className="flex gap-1 bg-hexagon-darker rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab("discussion")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "discussion"
                        ? "bg-primary-600 text-white"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Comments
                  </button>
                  <button
                    onClick={() => setActiveTab("suggestions")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "suggestions"
                        ? "bg-primary-600 text-white"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Suggestions
                  </button>
                </div>
              </div>

              {/* Comment Form */}
              {isAuthenticated ? (
                <form onSubmit={handleCommentSubmit} className="mb-6">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder={
                      activeTab === "discussion"
                        ? "Share your thoughts on this idea..."
                        : "Suggest an improvement or addition..."
                    }
                    className="input min-h-[100px] resize-none"
                    rows={4}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={!commentContent.trim() || submittingComment}
                    >
                      {submittingComment ? (
                        <div className="spinner h-4 w-4 mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Post{" "}
                      {activeTab === "discussion" ? "Comment" : "Suggestion"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-hexagon-darker border border-hexagon-border rounded-lg p-6 mb-6 text-center">
                  <p className="text-gray-400 mb-3">
                    Sign in to join the discussion
                  </p>
                  <Link href="/login" className="btn btn-primary">
                    Sign In
                  </Link>
                </div>
              )}

              {/* Comments Tree */}
              <CommentTree
                comments={comments}
                idea={idea}
                activeTab={activeTab}
                onUpdate={fetchComments}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              {/* Voting */}
              <div className="text-center mb-6 pb-6 border-b border-hexagon-border">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Vote on this idea
                </h3>
                <VoteButton
                  ideaId={idea.id}
                  voteSummary={voteSummary}
                  onVoteUpdate={handleVoteUpdate}
                />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleShare}
                  className="btn btn-outline w-full text-sm"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Idea
                </button>
                <button className="btn btn-ghost w-full text-sm text-gray-400">
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </button>
              </div>

              {/* Author Card */}
              <div className="mt-6 pt-6 border-t border-hexagon-border">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                  Submitted by
                </p>
                <Link
                  href={`/profile/${author.username}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="h-10 w-10 rounded-full bg-primary-700 flex items-center justify-center text-white text-sm font-bold">
                    {author.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200 group-hover:text-primary-400 transition-colors">
                      @{author.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {author.full_name || author.role}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
