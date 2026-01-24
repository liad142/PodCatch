"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { PodcastCard } from "@/components/PodcastCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import type { Podcast } from "@/types/database";
import { Radio } from "lucide-react";

interface PodcastWithCount extends Podcast {
  episode_count: number;
}

export default function Home() {
  const [podcasts, setPodcasts] = useState<PodcastWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPodcasts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch podcasts
      const { data: podcastsData, error: podcastsError } = await supabase
        .from("podcasts")
        .select("*")
        .order("created_at", { ascending: false });

      if (podcastsError) throw podcastsError;

      // Fetch episode counts for each podcast
      const podcastsWithCounts = await Promise.all(
        (podcastsData || []).map(async (podcast) => {
          const { count } = await supabase
            .from("episodes")
            .select("*", { count: "exact", head: true })
            .eq("podcast_id", podcast.id);

          return {
            ...podcast,
            episode_count: count || 0,
          };
        })
      );

      setPodcasts(podcastsWithCounts);
    } catch (err) {
      console.error("Error fetching podcasts:", err);
      setError("Failed to load podcasts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            AI-Powered Podcast Summaries
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Add any podcast via RSS feed and get instant AI-generated summaries,
            key insights, and curated resources from each episode.
          </p>
          <SearchBar onPodcastAdded={fetchPodcasts} />
        </section>

        {/* Podcasts Grid */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Radio className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Your Podcasts</h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg border bg-card overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : podcasts.length === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
              <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No podcasts yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Add your first podcast by entering an RSS feed URL above. We will
                fetch the episodes and you can start generating AI summaries.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {podcasts.map((podcast) => (
                <PodcastCard key={podcast.id} podcast={podcast} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
