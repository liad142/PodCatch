"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { SummaryPanel } from "@/components/SummaryPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import type { Episode, Podcast, SummaryStatus } from "@/types/database";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Brain,
} from "lucide-react";
import { SummarizeButton } from "@/components/SummarizeButton";
import { InlinePlayButton } from "@/components/PlayButton";
import { useAuth } from "@/contexts/AuthContext";

interface EpisodeData extends Episode {
  podcast?: Podcast;
}

interface SummariesData {
  quick: { status: SummaryStatus } | null;
  deep: { status: SummaryStatus } | null;
}

export default function EpisodePage() {
  const params = useParams();
  const episodeId = params.id as string;
  const { user, setShowAuthModal } = useAuth();

  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [summaries, setSummaries] = useState<SummariesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);

  const fetchEpisodeData = useCallback(async () => {
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

      // Fetch summaries status
      const summariesRes = await fetch(`/api/episodes/${episodeId}/summaries`);
      if (summariesRes.ok) {
        const summariesData = await summariesRes.json();
        setSummaries(summariesData.summaries);
      }
    } catch (err) {
      console.error("Error fetching episode:", err);
      setError("Failed to load episode");
    } finally {
      setIsLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    if (episodeId) {
      fetchEpisodeData();
    }
  }, [episodeId, fetchEpisodeData]);

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const hasSummaryReady = summaries?.quick?.status === 'ready' || summaries?.deep?.status === 'ready';

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {/* Main content */}
        <main className={`flex-1 container mx-auto px-4 py-8 max-w-4xl transition-all ${showSummaryPanel ? 'lg:mr-[450px]' : ''}`}>
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-9 w-32" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <div className="flex gap-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ) : error && !episode ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
              <Link href="/">
                <Button variant="outline" className="mt-4">
                  Return to Home
                </Button>
              </Link>
            </div>
          ) : episode ? (
            <div className="space-y-8">
              {/* Back Button */}
              <Link href={getBackLink()}>
                <Button variant="ghost" className="-ml-2">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to {episode.podcast?.title || "Podcast"}
                </Button>
              </Link>

              {/* Episode Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {episode.podcast && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {episode.podcast.title}
                        </p>
                      )}
                      <CardTitle className="text-2xl md:text-3xl">
                        {episode.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {episode.published_at && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(episode.published_at)}
                      </Badge>
                    )}
                    {episode.duration_seconds && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(episode.duration_seconds)}
                      </Badge>
                    )}
                    {hasSummaryReady && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Summary Available
                      </Badge>
                    )}
                  </div>

                  {episode.description && (
                    <p className="text-muted-foreground leading-relaxed">
                      {episode.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    {episode.audio_url && episode.podcast && (
                      <InlinePlayButton
                        track={{
                          id: episode.id,
                          title: episode.title,
                          artist: episode.podcast.title || episode.podcast.author || 'Unknown',
                          artworkUrl: episode.podcast.image_url || '',
                          audioUrl: episode.audio_url,
                          duration: episode.duration_seconds || undefined,
                        }}
                      />
                    )}
                    {user ? (
                      <Link href={`/episode/${episodeId}/insights`}>
                        <Button size="sm">
                          <Brain className="mr-2 h-4 w-4" />
                          View Insights
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setShowAuthModal(true, 'Sign up to explore AI-powered insights, chapters, and transcripts.')}
                      >
                        <Brain className="mr-2 h-4 w-4" />
                        View Insights
                      </Button>
                    )}
                    <SummarizeButton
                      episodeId={episodeId}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Summary Panel placeholder for mobile */}
              {showSummaryPanel && (
                <div className="lg:hidden">
                  <Card>
                    <SummaryPanel
                      episodeId={episodeId}
                      episodeTitle={episode.title}
                      onClose={() => setShowSummaryPanel(false)}
                    />
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Episode not found</p>
              <Link href="/">
                <Button variant="outline" className="mt-4">
                  Return to Home
                </Button>
              </Link>
            </div>
          )}
        </main>

        {/* Summary Side Panel (desktop) */}
        {showSummaryPanel && episode && (
          <aside className="hidden lg:block fixed right-0 top-0 h-screen w-[450px] bg-card border-l border-border overflow-hidden">
            <SummaryPanel
              episodeId={episodeId}
              episodeTitle={episode.title}
              onClose={() => setShowSummaryPanel(false)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
