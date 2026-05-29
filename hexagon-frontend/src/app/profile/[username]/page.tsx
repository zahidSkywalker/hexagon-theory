"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import IdeaCard from "@/components/IdeaCard";
import {
  ProfileSkeleton,
  ErrorState,
} from "@/components/LoadingSkeleton";
import {
  User,
  Calendar,
  Mail,
  Lightbulb,
  TrendingUp,
  MessageCircle,
  Shield,
} from "lucide-react";
import { formatDate, getRoleColor } from "@/lib/utils";
import { IdeaListItem, UserPublicProfile } from "@/types";

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [ideas, setIdeas] = useState<IdeaListItem[]>([]);
  const [stats, setStats] = useState({
    total_ideas: 0,
    total_votes_received: 0,
    total_comments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.users.getProfile(username);
      const data = res.data;
      setProfile(data);
      setStats(data.stats || { total_ideas: 0, total_votes_received: 0, total_comments: 0 });
      setIdeas(data.ideas || []);
    } catch (err: unknown) {
      console.error("Error fetching profile:", err);
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        setError(`User @${username} not found.`);
      } else {
        setError("Failed to load profile.");
      }
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) fetchProfile();
  }, [username, fetchProfile]);

  if (loading) {
    return (
      <div className="container-custom py-8 max-w-4xl mx-auto">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container-custom py-8 max-w-4xl mx-auto">
        <ErrorState message={error || "Profile not found"} onRetry={fetchProfile} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b border-hexagon-border bg-hexagon-card/30">
        <div className="container-custom py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
            @{profile.username}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Member since {formatDate(profile.created_at)}
          </p>
        </div>
      </div>

      <div className="container-custom py-8 max-w-4xl mx-auto">
        {/* Profile Card */}
        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-full bg-primary-700 flex items-center justify-center text-white text-2xl font-bold overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.username}'s avatar`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) parent.textContent = profile.username
                      .charAt(0)
                      .toUpperCase();
                  }}
                />
              ) : (
                profile.username.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-100">
                  {profile.full_name || profile.username}
                </h2>
                <span className={`badge ${getRoleColor(profile.role)}`}>
                  {profile.role}
                </span>
              </div>
              <p className="text-sm text-gray-400">@{profile.username}</p>
            </div>
          </div>

          {/* Details */}
          <div className="mt-5 flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="h-4 w-4" />
            Joined {formatDate(profile.created_at)}
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-gray-300 leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <Lightbulb className="h-6 w-6 text-primary-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-100">
              {stats.total_ideas}
            </div>
            <div className="text-xs text-gray-500">Ideas</div>
          </div>
          <div className="card text-center">
            <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-100">
              {stats.total_votes_received}
            </div>
            <div className="text-xs text-gray-500">Votes Received</div>
          </div>
          <div className="card text-center">
            <MessageCircle className="h-6 w-6 text-secondary-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-100">
              {stats.total_comments}
            </div>
            <div className="text-xs text-gray-500">Comments</div>
          </div>
        </div>

        {/* Ideas List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Ideas by @{profile.username}
          </h3>
          {ideas.length === 0 ? (
            <div className="card text-center py-10">
              <Lightbulb className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                @{profile.username} hasn&apos;t published any ideas yet
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
