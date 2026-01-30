"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useSummarizeQueue } from "@/contexts/SummarizeQueueContext";
import { SummarizeButton } from "@/components/SummarizeButton";
import type { Podcast } from "@/types/database";
import { ArrowLeft, Mic2, Calendar, Globe, Rss, Clock, Play, FileText, Loader2 } from "lucide-react";

interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  publishedAt: string;
  duration: number;
  audioUrl?: string;
  artworkUrl?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  isFromDb?: boolean;
}

interface SummaryAvailability {
  audioUrl: string;
  episodeId: string | null;
  hasQuickSummary: boolean;
  hasDeepSummary: boolean;
  quickStatus: string | null;
  deepStatus: string | null;
}

export default function PodcastPage() {
  const params = useParams();
  const podcastId = params.id as string;

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryAvailability, setSummaryAvailability] = useState<Map<string, SummaryAvailability>>(new Map());
  const [importingEpisodeId, setImportingEpisodeId] = useState<string | null>(null);

  const { addToQueue } = useSummarizeQueue();

  // Load podcast AND episodes together to avoid timing issues
  useEffect(() => {
    async function loadAll() {
      if (!podcastId) return;

      try {
        setIsLoading(true);
        setIsLoadingEpisodes(true);
        setError(null);

        // 1. Fetch podcast from DB
        const { data: podcastData, error: podcastError } = await supabase
          .from("podcasts")
          .select("*")
          .eq("id", podcastId)
          .single();

        if (podcastError) throw podcastError;
        setPodcast(podcastData);
        setIsLoading(false);

        // 2. Determine Apple ID directly (no separate state)
        const isApplePodcast = podcastData.rss_feed_url?.startsWith('apple:');
        const appleId = isApplePodcast
          ? podcastData.rss_feed_url.replace('apple:', '')
          : null;

        console.log('[PodcastPage] Loading episodes', {
          podcastId,
          isApplePodcast,
          appleId,
          rss_feed_url: podcastData.rss_feed_url
        });

        // 3. Fetch episodes
        if (appleId) {
          // Fetch from Apple API
          try {
            const response = await fetch(`/api/apple/podcasts/${appleId}/episodes?limit=50`);
            if (!response.ok) {
              console.error('[PodcastPage] Apple API error:', response.status);
              throw new Error('Failed to fetch from Apple');
            }
            const data = await response.json();
            console.log('[PodcastPage] Apple episodes loaded:', data.episodes?.length);
            setEpisodes(data.episodes || []);
          } catch (appleErr) {
            console.error('[PodcastPage] Apple fetch failed, trying local DB:', appleErr);
            // Fallback to local DB
            await fetchLocalEpisodes(podcastData);
          }
        } else {
          // Not an Apple podcast - fetch from local DB
          await fetchLocalEpisodes(podcastData);
        }

      } catch (err) {
        console.error("[PodcastPage] Error loading podcast:", err);
        setError("Failed to load podcast");
        setIsLoading(false);
      } finally {
        setIsLoadingEpisodes(false);
      }
    }

    async function fetchLocalEpisodes(podcastData: Podcast) {
      const { data: dbEpisodes, error: dbError } = await supabase
        .from('episodes')
        .select('*')
        .eq('podcast_id', podcastId)
        .order('published_at', { ascending: false });

      if (dbError) {
        console.error('[PodcastPage] DB episodes error:', dbError);
        setEpisodes([]);
        return;
      }

      console.log('[PodcastPage] Local episodes loaded:', dbEpisodes?.length);

      const mappedEpisodes: Episode[] = (dbEpisodes || []).map(ep => ({
        id: ep.id,
        podcastId: ep.podcast_id,
        title: ep.title,
        description: ep.description || '',
        publishedAt: ep.published_at || ep.created_at,
        duration: ep.duration_seconds || 0,
        audioUrl: ep.audio_url,
        artworkUrl: typeof podcastData.image_url === 'string' ? podcastData.image_url : undefined,
        isFromDb: true,
      }));

      setEpisodes(mappedEpisodes);
    }

    loadAll();
  }, [podcastId]);

  // Check for existing summaries
  useEffect(() => {
    async function checkSummaries() {
      const audioUrls = episodes
        .map(e => e.audioUrl)
        .filter((url): url is string => !!url);

      if (audioUrls.length === 0) return;

      try {
        const response = await fetch('/api/summaries/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioUrls }),
        });

        if (!response.ok) return;

        const data = await response.json();
        const availabilityMap = new Map<string, SummaryAvailability>();
        for (const item of data.availability) {
          availabilityMap.set(item.audioUrl, item);
        }
        setSummaryAvailability(availabilityMap);
      } catch (err) {
        console.error('Error checking summaries:', err);
      }
    }

    if (episodes.length > 0) {
      checkSummaries();
    }
  }, [episodes]);

  const handleSummarize = async (episode: Episode) => {
    if (!podcast || !episode.audioUrl) return;

    // If episode is from local DB, it already has the correct ID
    if (episode.isFromDb) {
      addToQueue(episode.id);
      return;
    }

    const availability = summaryAvailability.get(episode.audioUrl);
    if (availability?.episodeId) {
      addToQueue(availability.episodeId);
      return;
    }

    setImportingEpisodeId(episode.id);

    try {
      // Extract Apple ID from rss_feed_url
      const appleId = podcast.rss_feed_url?.startsWith('apple:')
        ? podcast.rss_feed_url.replace('apple:', '')
        : podcastId;

      const response = await fetch('/api/episodes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode: {
            externalId: episode.id,
            title: episode.title,
            description: episode.description,
            publishedAt: episode.publishedAt,
            duration: episode.duration,
            audioUrl: episode.audioUrl,
          },
          podcast: {
            externalId: appleId,
            name: podcast.title,
            artistName: podcast.author || '',
            artworkUrl: typeof podcast.image_url === 'string' ? podcast.image_url : '',
            feedUrl: podcast.rss_feed_url,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to import episode');

      const { episodeId } = await response.json();

      setSummaryAvailability(prev => {
        const updated = new Map(prev);
        updated.set(episode.audioUrl!, {
          audioUrl: episode.audioUrl!,
          episodeId,
          hasQuickSummary: false,
          hasDeepSummary: false,
          quickStatus: null,
          deepStatus: null,
        });
        return updated;
      });

      addToQueue(episodeId);
    } catch (err) {
      console.error('Error importing episode:', err);
    } finally {
      setImportingEpisodeId(null);
    }
  };

  const getEpisodeSummaryInfo = (episode: Episode) => {
    // For local DB episodes, the episode.id IS the episodeId
    if (episode.isFromDb) {
      const info = episode.audioUrl ? summaryAvailability.get(episode.audioUrl) : null;
      return {
        audioUrl: episode.audioUrl || '',
        episodeId: episode.id,
        hasQuickSummary: info?.hasQuickSummary || false,
        hasDeepSummary: info?.hasDeepSummary || false,
        quickStatus: info?.quickStatus || null,
        deepStatus: info?.deepStatus || null,
      };
    }

    if (!episode.audioUrl) return null;
    return summaryAvailability.get(episode.audioUrl) || null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };

  if (error && !podcast) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
            <Link href="/my-podcasts">
              <Button variant="outline" className="mt-4">
                Return to My Podcasts
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/my-podcasts">
          <Button variant="ghost" className="mb-6 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Podcasts
          </Button>
        </Link>

        {isLoading ? (
          <div className="space-y-8">
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
                  <p className="text-muted-foreground leading-relaxed line-clamp-3">
                    {podcast.description}
                  </p>
                )}
                {podcast.rss_feed_url && !podcast.rss_feed_url.startsWith('apple:') && (
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
                )}
              </div>
            </div>

            {/* Episodes Section */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">Episodes</h2>

              {isLoadingEpisodes ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-12 w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : episodes.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground mb-2">
                    No episodes found.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This might be a temporary issue. Try refreshing the page.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {episodes.map((episode) => {
                    const summaryInfo = getEpisodeSummaryInfo(episode);
                    const hasSummary = summaryInfo?.hasQuickSummary || summaryInfo?.hasDeepSummary;
                    const canNavigate = summaryInfo?.episodeId;

                    return (
                      <Card key={episode.id} className="hover:bg-accent/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {episode.artworkUrl && (
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                <Image
                                  src={episode.artworkUrl.replace('100x100', '200x200')}
                                  alt={episode.title}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              {hasSummary && (
                                <div className="mb-2">
                                  <Badge variant="default" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    Summary Ready
                                  </Badge>
                                </div>
                              )}

                              {canNavigate ? (
                                <Link href={`/episode/${summaryInfo.episodeId}`}>
                                  <h3 className="font-medium line-clamp-2 mb-1 hover:text-primary hover:underline cursor-pointer">
                                    {episode.seasonNumber && episode.episodeNumber && (
                                      <span className="text-muted-foreground text-sm mr-2">
                                        S{episode.seasonNumber}E{episode.episodeNumber}
                                      </span>
                                    )}
                                    {episode.title}
                                  </h3>
                                </Link>
                              ) : (
                                <h3 className="font-medium line-clamp-2 mb-1">
                                  {episode.seasonNumber && episode.episodeNumber && (
                                    <span className="text-muted-foreground text-sm mr-2">
                                      S{episode.seasonNumber}E{episode.episodeNumber}
                                    </span>
                                  )}
                                  {episode.title}
                                </h3>
                              )}

                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(episode.publishedAt)}
                                </span>
                                {episode.duration > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(episode.duration)}
                                  </span>
                                )}
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {episode.description}
                              </p>

                              <div className="flex gap-2 mt-2">
                                {episode.audioUrl && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a
                                      href={episode.audioUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Play className="h-4 w-4 mr-2" />
                                      Play Episode
                                    </a>
                                  </Button>
                                )}
                                {episode.isFromDb || summaryInfo?.episodeId ? (
                                  <SummarizeButton
                                    episodeId={episode.isFromDb ? episode.id : summaryInfo!.episodeId!}
                                    initialStatus={hasSummary ? 'ready' : 'not_ready'}
                                  />
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleSummarize(episode)}
                                    disabled={importingEpisodeId === episode.id}
                                  >
                                    {importingEpisodeId === episode.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importing...
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Summarize
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Podcast not found</p>
            <Link href="/my-podcasts">
              <Button variant="outline" className="mt-4">
                Return to My Podcasts
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
