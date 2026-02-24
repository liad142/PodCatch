"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { EpisodeSmartFeed } from "@/components/insights/EpisodeSmartFeed";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import type { Episode, Podcast } from "@/types/database";
import { Clock, Calendar, BarChart3, ExternalLink, ChevronRight, Share2 } from "lucide-react";
import { PlayButton } from "@/components/PlayButton";
import { useIsAdmin } from "@/hooks/useIsAdmin";

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
  const isAdmin = useIsAdmin();

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

  const isYouTube = episode?.podcast?.rss_feed_url?.startsWith('youtube:channel:');

  // Extract Apple podcast ID from rss_feed_url (format: "apple:123456" or actual RSS URL)
  const getBackLink = () => {
    const rssUrl = episode?.podcast?.rss_feed_url;
    if (rssUrl?.startsWith('youtube:channel:')) {
      return '/discover';
    }
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

  // For YouTube videos, derive thumbnail from video URL; otherwise use podcast artwork
  const youtubeVideoId = isYouTube && episode?.audio_url
    ? new URL(episode.audio_url).searchParams.get('v')
    : null;

  const artworkUrl = isYouTube && youtubeVideoId
    ? `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`
    : episode?.podcast?.image_url &&
      typeof episode.podcast.image_url === "string" &&
      episode.podcast.image_url.startsWith("http")
        ? episode.podcast.image_url
        : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* ── Hero Header ── */}
      <div className="border-b border-border mb-8">
        <div className="container mx-auto px-4 pt-5 pb-8 max-w-3xl">
          {isLoading ? (
            <div className="space-y-5">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-5 items-start">
                <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
                <div className="space-y-3 flex-1 pt-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-5/6" />
                  <div className="flex gap-3 pt-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-10 w-24 rounded-lg" />
                    <Skeleton className="h-10 w-20 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ) : episode ? (
            <div className="space-y-5">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-caption text-muted-foreground">
                <button
                  onClick={() => router.push('/discover')}
                  className="hover:text-foreground transition-colors"
                >
                  Discover
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <button
                  onClick={() => router.push(getBackLink())}
                  className="hover:text-foreground transition-colors truncate max-w-[200px]"
                >
                  {episode.podcast?.title || "Podcast"}
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground truncate max-w-[200px]">Insights</span>
                {isAdmin && (
                  <>
                    <span className="mx-1">|</span>
                    <button
                      onClick={() => router.push(`/admin/episodes/${episodeId}/analytics`)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <BarChart3 className="h-3 w-3" />
                      Analytics
                    </button>
                  </>
                )}
              </nav>

              {/* Art + Info */}
              <div className="flex gap-5 items-start">
                {artworkUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artworkUrl}
                    alt={episode.podcast?.title || "Podcast artwork"}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 shadow-[var(--shadow-2)]"
                  />
                )}

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Podcast name */}
                  <button
                    onClick={() => router.push(getBackLink())}
                    className="text-body-sm text-muted-foreground font-medium hover:text-foreground transition-colors truncate block max-w-full"
                  >
                    {episode.podcast?.title || "Unknown Podcast"}
                  </button>

                  {/* Episode title */}
                  <h1 className="text-h1 text-foreground line-clamp-3">
                    {episode.title}
                  </h1>

                  {/* Metadata: date + duration */}
                  <div className="flex items-center gap-4 text-muted-foreground">
                    {episode.published_at && (
                      <span className="inline-flex items-center gap-1.5 text-body-sm">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(episode.published_at)}
                      </span>
                    )}
                    {episode.duration_seconds && (
                      <span className="inline-flex items-center gap-1.5 text-body-sm">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(episode.duration_seconds)}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isYouTube && episode.audio_url ? (
                      <Button
                        onClick={() => window.open(episode.audio_url, '_blank', 'noopener,noreferrer')}
                        className="h-10 px-5 bg-red-600 hover:bg-red-500 text-white border-0 gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Watch on YouTube
                      </Button>
                    ) : episode.audio_url && episode.podcast ? (
                      <PlayButton
                        track={{
                          id: episode.id,
                          title: episode.title,
                          artist: episode.podcast.title || episode.podcast.author || "Unknown",
                          artworkUrl: episode.podcast.image_url || "",
                          audioUrl: episode.audio_url,
                          duration: episode.duration_seconds || undefined,
                        }}
                        size="lg"
                        variant="primary"
                        className="h-10 px-5 bg-green-600 hover:bg-green-500 text-white border-0 gap-2 rounded-lg"
                      />
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 px-4 gap-2 text-muted-foreground"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({ title: episode.title, url: window.location.href });
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                        }
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Smart Feed */}
      <div className="flex-1">
        {episode && <EpisodeSmartFeed episode={episode} />}
      </div>
    </div>
  );
}
