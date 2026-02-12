"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { EpisodeSmartFeed } from "@/components/insights/EpisodeSmartFeed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      {/* Episode Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-6 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ) : episode ? (
            <div className="flex items-start gap-4">
              {/* Podcast Image */}
              {episode.podcast?.image_url && typeof episode.podcast.image_url === 'string' && episode.podcast.image_url.startsWith('http') && (
                <div className="hidden sm:block shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={episode.podcast.image_url}
                    alt={episode.podcast.title || 'Podcast'}
                    width={80}
                    height={80}
                    className="rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Episode Info */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Back Button + Podcast Name */}
                <div className="flex items-center gap-2 text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 -ml-2"
                    onClick={() => router.push(getBackLink())}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  {episode.podcast && (
                    <span className="text-muted-foreground truncate">
                      {episode.podcast.title}
                    </span>
                  )}
                </div>

                {/* Episode Title */}
                <h1 className="text-lg md:text-xl font-bold leading-tight line-clamp-2">
                  {episode.title}
                </h1>

                {/* Meta info */}
                <div className="flex items-center flex-wrap gap-2 text-sm">
                  {episode.published_at && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Calendar className="h-3 w-3" />
                      {formatDate(episode.published_at)}
                    </Badge>
                  )}
                  {episode.duration_seconds && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Clock className="h-3 w-3" />
                      {formatDuration(episode.duration_seconds)}
                    </Badge>
                  )}
                  {episode.audio_url && episode.podcast && (
                    <PlayButton
                      track={{
                        id: episode.id,
                        title: episode.title,
                        artist: episode.podcast.title || episode.podcast.author || 'Unknown',
                        artworkUrl: episode.podcast.image_url || '',
                        audioUrl: episode.audio_url,
                        duration: episode.duration_seconds || undefined,
                      }}
                      size="sm"
                      variant="outline"
                    />
                  )}
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
