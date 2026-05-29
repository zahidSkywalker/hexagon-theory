"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import IdeaCard from "@/components/IdeaCard";
import {
  ProfileSkeleton,
  ErrorState,
} from "@/components/LoadingSkeleton";
import {
  User,
  Mail,
  Calendar,
  Edit3,
  Save,
  X,
  Lightbulb,
  TrendingUp,
  MessageCircle,
  Shield,
  Camera,
} from "lucide-react";
import { formatDate, getRoleColor } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [profileData, setProfileData] = useState<{
    full_name: string;
    bio: string;
    avatar_url: string;
    username: string;
    email: string;
    role: string;
    created_at: string;
  } | null>(null);

  const [stats, setStats] = useState({
    total_ideas: 0,
    total_votes_received: 0,
    total_comments: 0,
  });
  const [ideas, setIdeas] = useState<any[]>([]);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", bio: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.users.getOwnProfile();
      const data = res.data;
      setProfileData(data);
      setStats(data.stats || { total_ideas: 0, total_votes_received: 0, total_comments: 0 });
      setIdeas(data.ideas || []);
      setEditForm({
        full_name: data.full_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, authLoading, router, fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.users.updateProfile(editForm);
      setEditing(false);
      showToast("Profile updated successfully!", "success");
      await refreshUser();
      await fetchProfile();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      showToast(axiosErr?.response?.data?.detail || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container-custom py-8">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-8">
        <ErrorState message={error} onRetry={fetchProfile} />
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b border-hexagon-border bg-hexagon-card/30">
        <div className="container-custom py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
            My Profile
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your account and view your contributions
          </p>
        </div>
      </div>

      <div className="container-custom py-8 max-w-4xl mx-auto">
        {/* Profile Card */}
        <div className="card mb-8">
          {editing ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-100">Edit Profile</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditForm({
                        full_name: profileData.full_name || "",
                        bio: profileData.bio || "",
                        avatar_url: profileData.avatar_url || "",
                      });
                    }}
                    className="btn btn-ghost btn-sm"
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn btn-primary btn-sm"
                    disabled={saving}
                  >
                    {saving ? (
                      <div className="spinner h-4 w-4 mr-1" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </button>
                </div>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Avatar URL
                </label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-primary-700 flex items-center justify-center text-white text-lg font-bold overflow-hidden flex-shrink-0">
                    {editForm.avatar_url ? (
                      <img
                        src={editForm.avatar_url}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Camera className="h-5 w-5 text-primary-300" />
                    )}
                  </div>
                  <input
                    type="url"
                    value={editForm.avatar_url}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, avatar_url: e.target.value }))
                    }
                    className="input flex-1"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, full_name: e.target.value }))
                  }
                  className="input"
                  placeholder="John Doe"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, bio: e.target.value }))
                  }
                  className="input min-h-[100px] resize-none"
                  placeholder="Tell others about yourself..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editForm.bio.length}/500 characters
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Avatar */}
                <div className="h-20 w-20 rounded-full bg-primary-700 flex items-center justify-center text-white text-2xl font-bold overflow-hidden flex-shrink-0">
                  {profileData.avatar_url ? (
                    <img
                      src={profileData.avatar_url}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) parent.textContent = profileData.username
                          .charAt(0)
                          .toUpperCase();
                      }}
                    />
                  ) : (
                    profileData.username.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-gray-100">
                      {profileData.full_name || profileData.username}
                    </h2>
                    <span className={`badge ${getRoleColor(profileData.role)}`}>
                      {profileData.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    @{profileData.username}
                  </p>
                </div>

                <button
                  onClick={() => setEditing(true)}
                  className="btn btn-outline btn-sm"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit Profile
                </button>
              </div>

              {/* Details */}
              <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail className="h-4 w-4" />
                  {profileData.email}
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(profileData.created_at)}
                </div>
              </div>

              {profileData.bio && (
                <p className="mt-4 text-sm text-gray-300 leading-relaxed">
                  {profileData.bio}
                </p>
              )}
            </>
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
            Your Ideas
          </h3>
          {ideas.length === 0 ? (
            <div className="card text-center py-10">
              <Lightbulb className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">
                You haven&apos;t submitted any ideas yet
              </p>
              <a href="/ideas/new" className="btn btn-primary">
                Submit Your First Idea
              </a>
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
