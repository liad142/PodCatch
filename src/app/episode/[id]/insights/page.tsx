"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { EpisodeSmartFeed } from "@/components/insights/EpisodeSmartFeed";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import type { Episode, Podcast } from "@/types/database";
import { ArrowLeft, Clock, Calendar, BarChart3 } from "lucide-react";
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

  const artworkUrl =
    episode?.podcast?.image_url &&
    typeof episode.podcast.image_url === "string" &&
    episode.podcast.image_url.startsWith("http")
      ? episode.podcast.image_url
      : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f111a] flex flex-col">
      <Header />

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden">

        {/* Blurred artwork background */}
        {artworkUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworkUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-50 dark:opacity-35 pointer-events-none select-none"
            style={{ filter: "blur(48px)", transform: "scale(1.25)" }}
          />
        )}

        {/* Dark overlay — fades strongly at top, lightens toward bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/10" />

        {/* Bottom fade — tall and smooth into the page background */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-b from-transparent to-slate-50 dark:to-[#0f111a]" />

        {/* ── Content ── */}
        <div className="relative z-10 container mx-auto px-4 pt-5 pb-20 max-w-4xl">
          {isLoading ? (
            <div className="space-y-5">
              <Skeleton className="h-4 w-28 bg-white/20" />
              <div className="flex gap-6 items-start">
                <Skeleton className="w-24 h-24 rounded-xl shrink-0 bg-white/20" />
                <div className="space-y-3 flex-1 pt-1">
                  <Skeleton className="h-8 w-5/6 bg-white/20" />
                  <Skeleton className="h-5 w-2/3 bg-white/20" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-6 w-24 rounded-full bg-white/20" />
                    <Skeleton className="h-6 w-16 rounded-full bg-white/20" />
                  </div>
                  <Skeleton className="w-14 h-14 rounded-full bg-white/20" />
                </div>
              </div>
            </div>
          ) : episode ? (
            <div className="space-y-5">
              {/* Back nav + Admin analytics */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => router.push(getBackLink())}
                  className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors group w-fit"
                >
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="truncate max-w-[220px] font-medium">
                    {episode.podcast?.title || "Back"}
                  </span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => router.push(`/admin/episodes/${episodeId}/analytics`)}
                    className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="font-medium">Analytics</span>
                  </button>
                )}
              </div>

              {/* Art + Info */}
              <div className="flex gap-6 items-start">
                {artworkUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artworkUrl}
                    alt={episode.podcast?.title || "Podcast artwork"}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover border border-white/10 shrink-0"
                    style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)" }}
                  />
                )}

                <div className="flex-1 min-w-0 space-y-3">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug line-clamp-3 text-white drop-shadow-sm">
                    {episode.title}
                  </h1>

                  {/* Play CTA + metadata pills — single aligned row */}
                  <div className="flex items-center gap-3">
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
                        size="lg"
                        variant="primary"
                        className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 border-0 shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 text-white shrink-0"
                      />
                    )}
                    {episode.published_at && (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 rounded-full px-3 py-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(episode.published_at)}
                      </span>
                    )}
                    {episode.duration_seconds && (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 rounded-full px-3 py-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(episode.duration_seconds)}
                      </span>
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
