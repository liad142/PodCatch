"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { EpisodeList } from "@/components/EpisodeList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import type { Podcast, EpisodeWithSummary } from "@/types/database";
import { ArrowLeft, Mic2, Calendar, Globe, Rss } from "lucide-react";

export default function PodcastPage() {
  const params = useParams();
  const podcastId = params.id as string;

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeWithSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPodcastData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch podcast details
        const { data: podcastData, error: podcastError } = await supabase
          .from("podcasts")
          .select("*")
          .eq("id", podcastId)
          .single();

        if (podcastError) throw podcastError;
        setPodcast(podcastData);

        // Fetch episodes with their summaries
        const { data: episodesData, error: episodesError } = await supabase
          .from("episodes")
          .select("*")
          .eq("podcast_id", podcastId)
          .order("published_at", { ascending: false });

        if (episodesError) throw episodesError;

        // Fetch transcripts and summaries for episodes
        const episodesWithSummaries = await Promise.all(
          (episodesData || []).map(async (episode) => {
            // Get transcript
            const { data: transcriptData } = await supabase
              .from("transcripts")
              .select("*")
              .eq("episode_id", episode.id)
              .single();

            let summary = null;
            if (transcriptData) {
              // Get summary if transcript exists
              const { data: summaryData } = await supabase
                .from("summaries")
                .select("*")
                .eq("transcript_id", transcriptData.id)
                .single();
              summary = summaryData;
            }

            return {
              ...episode,
              transcript: transcriptData || undefined,
              summary: summary || undefined,
            };
          })
        );

        setEpisodes(episodesWithSummaries);
      } catch (err) {
        console.error("Error fetching podcast:", err);
        setError("Failed to load podcast");
      } finally {
        setIsLoading(false);
      }
    }

    if (podcastId) {
      fetchPodcastData();
    }
  }, [podcastId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Podcasts
          </Button>
        </Link>

        {isLoading ? (
          <div className="space-y-8">
            {/* Podcast Info Skeleton */}
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="w-48 h-48 rounded-lg shrink-0" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
            {/* Episodes Skeleton */}
            <EpisodeList episodes={[]} isLoading={true} />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                Return to Home
              </Button>
            </Link>
          </div>
        ) : podcast ? (
          <div className="space-y-8">
            {/* Podcast Info Header */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-48 h-48 shrink-0 rounded-lg overflow-hidden bg-muted">
                {podcast.image_url ? (
                  <Image
                    src={Array.isArray(podcast.image_url) ? podcast.image_url[0] : podcast.image_url}
                    alt={podcast.title}
                    width={192}
                    height={192}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Mic2 className="h-16 w-16 text-primary/40" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{podcast.title}</h1>
                {podcast.author && (
                  <p className="text-lg text-muted-foreground mb-3">
                    by {podcast.author}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">
                    {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
                  </Badge>
                  {podcast.language && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {podcast.language.toUpperCase()}
                    </Badge>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Added {formatDate(podcast.created_at)}
                  </Badge>
                </div>
                {podcast.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {podcast.description}
                  </p>
                )}
                <div className="mt-4">
                  <a
                    href={podcast.rss_feed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Rss className="h-4 w-4" />
                    RSS Feed
                  </a>
                </div>
              </div>
            </div>

            {/* Episodes Section */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">Episodes</h2>
              <EpisodeList episodes={episodes} />
            </section>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Podcast not found</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                Return to Home
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
