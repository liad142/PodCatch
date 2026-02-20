"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { EpisodeSmartFeed } from "@/components/insights/EpisodeSmartFeed";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import type { Episode, Podcast } from "@/types/database";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { PlayButton } from "@/components/PlayButton";

interface EpisodeData extends Episode {
  podcast?: Podcast;
}

export default function EpisodeInsightsPage() {
  const params = useParams();
  const router = useRouter();
  const episodeId = params.id as string;

  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisode = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch episode details
      const { data: episodeData, error: episodeError } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", episodeId)
        .single();

      if (episodeError) throw episodeError;

      // Fetch podcast details
      const { data: podcastData } = await supabase
        .from("podcasts")
        .select("*")
        .eq("id", episodeData.podcast_id)
        .single();

      setEpisode({
        ...episodeData,
        podcast: podcastData || undefined,
      });
    } catch (err) {
      console.error("Error fetching episode:", err);
      setError("Failed to load episode");
    } finally {
      setIsLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    if (episodeId) {
      fetchEpisode();
    }
  }, [episodeId, fetchEpisode]);

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Extract Apple podcast ID from rss_feed_url (format: "apple:123456" or actual RSS URL)
  const getBackLink = () => {
    const rssUrl = episode?.podcast?.rss_feed_url;
    if (rssUrl?.startsWith('apple:')) {
      const appleId = rssUrl.replace('apple:', '');
      return `/browse/podcast/${appleId}`;
    }
    // Fallback to internal podcast page if not an Apple import
    return `/podcast/${episode?.podcast_id}`;
  };

  if (error && !episode) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f111a] flex flex-col">
      <Header />

      {/* Episode Header */}
      <div className="border-b border-border/60 bg-background/80 dark:bg-card/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5 max-w-4xl">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : episode ? (
            <div className="space-y-3">
              {/* Back nav */}
              <button
                onClick={() => router.push(getBackLink())}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit"
              >
                <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="truncate max-w-[200px]">{episode.podcast?.title || "Back"}</span>
              </button>

              {/* Main row: art + info */}
              <div className="flex gap-3.5 items-start">
                {episode.podcast?.image_url &&
                  typeof episode.podcast.image_url === "string" &&
                  episode.podcast.image_url.startsWith("http") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={episode.podcast.image_url}
                    alt={episode.podcast.title || "Podcast"}
                    className="w-14 h-14 rounded-xl object-cover shadow-sm shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0 space-y-2">
                  <h1 className="text-lg md:text-xl font-bold leading-snug line-clamp-2 text-foreground">
                    {episode.title}
                  </h1>

                  <div className="flex items-center flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
                    {episode.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(episode.published_at)}
                      </span>
                    )}
                    {episode.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(episode.duration_seconds)}
                      </span>
                    )}
                    {episode.audio_url && episode.podcast && (
                      <PlayButton
                        track={{
                          id: episode.id,
                          title: episode.title,
                          artist: episode.podcast.title || episode.podcast.author || "Unknown",
                          artworkUrl: episode.podcast.image_url || "",
                          audioUrl: episode.audio_url,
                          duration: episode.duration_seconds || undefined,
                        }}
                        size="sm"
                        variant="ghost"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Smart Feed */}
      <div className="flex-1 py-6">
        {episode && <EpisodeSmartFeed episode={episode} />}
      </div>
    </div>
  );
}
