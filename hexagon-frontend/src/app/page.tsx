"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IdeaListItem } from "@/types";
import { api } from "@/lib/api";
import IdeaCard from "@/components/IdeaCard";
import { IdeaCardSkeleton, ErrorState } from "@/components/LoadingSkeleton";
import { Lightbulb, TrendingUp, Search, Plus, Zap, Globe, Users } from "lucide-react";

export default function HomePage() {
  const [ideas, setIdeas] = useState<IdeaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIdeas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.ideas.list({ sort_by: "trending", limit: 6 });
      setIdeas(response.data);
    } catch (err) {
      console.error("Error fetching ideas:", err);
      setError("Failed to load trending ideas. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950/50 via-hexagon-dark to-secondary-950/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-600/10 via-transparent to-transparent" />

        <div className="relative container-custom py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              <span className="gradient-text">Crowdsource Innovation</span>
              <br />
              <span className="text-gray-200">For a Better World</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Submit, discover, and collaborate on development ideas aimed at
              improving countries, communities, and infrastructure globally.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/ideas"
                className="btn btn-primary px-8 py-3 text-base"
              >
                <Search className="h-5 w-5 mr-2" />
                Explore Ideas
              </Link>
              <Link
                href="/ideas/new"
                className="btn btn-outline px-8 py-3 text-base"
              >
                <Plus className="h-5 w-5 mr-2" />
                Submit Your Idea
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container-custom py-16 md:py-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="card card-hover text-center animate-slide-up">
            <div className="bg-primary-500/10 rounded-xl w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="h-7 w-7 text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-100 mb-2">
              Submit Ideas
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Share your innovative development proposals with detailed
              documentation and multimedia support.
            </p>
          </div>

          <div className="card card-hover text-center animate-slide-up">
            <div className="bg-secondary-500/10 rounded-xl w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-7 w-7 text-secondary-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-100 mb-2">
              Community Voting
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Upvote promising ideas and provide constructive suggestions for
              improvement.
            </p>
          </div>

          <div className="card card-hover text-center animate-slide-up sm:col-span-2 lg:col-span-1">
            <div className="bg-green-500/10 rounded-xl w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <Globe className="h-7 w-7 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-100 mb-2">
              Institutional Interest
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Connect with governments and NGOs interested in implementing your
              ideas.
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-hexagon-border bg-hexagon-card/50">
        <div className="container-custom py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Lightbulb, label: "Ideas Shared", value: "1,200+" },
              { icon: Users, label: "Active Members", value: "5,000+" },
              { icon: TrendingUp, label: "Votes Cast", value: "25,000+" },
              { icon: Globe, label: "Regions Covered", value: "120+" },
            ].map((stat) => (
              <div key={stat.label}>
                <stat.icon className="h-6 w-6 text-primary-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-100">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Ideas */}
      <section className="container-custom py-16 md:py-24">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary-400" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-100">
              Trending Ideas
            </h2>
          </div>
          <Link
            href="/ideas"
            className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            View All →
          </Link>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchIdeas} />
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <IdeaCardSkeleton key={i} />
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-16">
            <Lightbulb className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
              No ideas yet. Be the first to share your vision!
            </p>
            <Link href="/ideas/new" className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Submit Idea
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-hexagon-border bg-gradient-to-br from-primary-950/30 to-secondary-950/20">
        <div className="container-custom py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-4">
            Ready to Make an Impact?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join thousands of innovators and thinkers shaping the future of
            global development.
          </p>
          <Link href="/register" className="btn btn-primary px-8 py-3 text-base">
            Get Started — It&apos;s Free
          </Link>
        </div>
      </section>
    </div>
  );
}
