'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Apple, Clock, Calendar, ExternalLink, Loader2, FileText } from 'lucide-react';
import { SummarizeButton } from '@/components/SummarizeButton';
import { InlinePlayButton } from '@/components/PlayButton';
import { useSummarizeQueue } from '@/contexts/SummarizeQueueContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCountry } from '@/contexts/CountryContext';

interface Podcast {
  id: string;
  name: string;
  artistName: string;
  description: string;
  artworkUrl: string;
  feedUrl?: string;
  genres: string[];
  trackCount: number;
  contentAdvisoryRating?: string;
}

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
}

interface SummaryAvailability {
  audioUrl: string;
  episodeId: string | null;
  hasQuickSummary: boolean;
  hasDeepSummary: boolean;
  quickStatus: string | null;
  deepStatus: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PodcastPage({ params }: PageProps) {
  const { id: podcastId } = use(params);
  const { country } = useCountry();
  const { user, setShowCompactPrompt } = useAuth();

  // Detect if this is a Podcastindex-only podcast (pi:{feedId} format)
  const isPiPodcast = podcastId.startsWith('pi:');
  const piFeedId = isPiPodcast ? podcastId.slice(3) : null;

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingPodcast, setIsLoadingPodcast] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importingEpisodeId, setImportingEpisodeId] = useState<string | null>(null);
  const [summaryAvailability, setSummaryAvailability] = useState<Map<string, SummaryAvailability>>(new Map());

  const fetchPodcast = useCallback(async () => {
    setIsLoadingPodcast(true);
    try {
      const url = isPiPodcast
        ? `/api/pi/podcasts/${piFeedId}`
        : `/api/apple/podcasts/${podcastId}?country=${country.toLowerCase()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch podcast');
      const data = await response.json();
      setPodcast(data.podcast);
    } catch (err) {
      console.error('Error fetching podcast:', err);
      setError('Failed to load podcast details');
    } finally {
      setIsLoadingPodcast(false);
    }
  }, [podcastId, country, isPiPodcast, piFeedId]);

  const EPISODES_PER_PAGE = 50;

  const fetchEpisodes = useCallback(async () => {
    setIsLoadingEpisodes(true);
    try {
      const url = isPiPodcast
        ? `/api/pi/podcasts/${piFeedId}/episodes?limit=${EPISODES_PER_PAGE}&offset=0`
        : `/api/apple/podcasts/${podcastId}/episodes?limit=${EPISODES_PER_PAGE}&offset=0`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch episodes');
      const data = await response.json();
      setEpisodes(data.episodes || []);
      setHasMore(data.hasMore ?? false);
      setTotalCount(data.totalCount ?? data.episodes?.length ?? 0);
    } catch (err) {
      console.error('Error fetching episodes:', err);
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, [podcastId, isPiPodcast, piFeedId]);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const url = isPiPodcast
        ? `/api/pi/podcasts/${piFeedId}/episodes?limit=${EPISODES_PER_PAGE}&offset=${episodes.length}`
        : `/api/apple/podcasts/${podcastId}/episodes?limit=${EPISODES_PER_PAGE}&offset=${episodes.length}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch more episodes');
      const data = await response.json();
      setEpisodes(prev => [...prev, ...(data.episodes || [])]);
      setHasMore(data.hasMore ?? false);
      setTotalCount(data.totalCount ?? totalCount);
    } catch (err) {
      console.error('Error loading more episodes:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [podcastId, episodes.length, totalCount, isPiPodcast, piFeedId]);

  useEffect(() => {
    fetchPodcast();
    fetchEpisodes();
  }, [fetchPodcast, fetchEpisodes]);

  // Check for existing summaries after episodes load
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

  const { addToQueue, queue } = useSummarizeQueue();

  // Update summaryAvailability when queue items complete
  useEffect(() => {
    const completedItems = queue.filter(item => item.state === 'ready');

    if (completedItems.length > 0) {
      setSummaryAvailability(prev => {
        const updated = new Map(prev);

        for (const item of completedItems) {
          // Find the episode with this episodeId
          const episode = episodes.find(ep => {
            const info = prev.get(ep.audioUrl || '');
            return info?.episodeId === item.episodeId;
          });

          if (episode?.audioUrl) {
            const existing = prev.get(episode.audioUrl);
            if (existing && !existing.hasDeepSummary) {
              // Update to mark as ready
              updated.set(episode.audioUrl, {
                ...existing,
                hasDeepSummary: true,
                deepStatus: 'ready',
              });
            }
          }
        }

        return updated;
      });
    }
  }, [queue, episodes]);

  const handleSummarize = async (episode: Episode) => {
    if (!podcast || !episode.audioUrl) return;

    // Check authentication
    if (!user) {
      setShowCompactPrompt(true, 'Only registered users can summarize episodes. Please sign in or create an account to continue.');
      return;
    }

    // Check if episode already exists in DB
    const availability = summaryAvailability.get(episode.audioUrl);
    if (availability?.episodeId) {
      // Episode already imported - add to queue and let SummarizeButton handle it
      addToQueue(availability.episodeId);
      return;
    }

    setImportingEpisodeId(episode.id);

    try {
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
            externalId: podcast.id,
            name: podcast.name,
            artistName: podcast.artistName,
            artworkUrl: podcast.artworkUrl,
            feedUrl: podcast.feedUrl,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import episode');
      }

      const { episodeId } = await response.json();

      // Update local state so SummarizeButton shows for this episode
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

      // Add to queue to start summarization
      addToQueue(episodeId);
    } catch (err) {
      console.error('Error importing episode:', err);
    } finally {
      setImportingEpisodeId(null);
    }
  };

  // Helper to get summary status for an episode
  const getEpisodeSummaryInfo = (episode: Episode) => {
    if (!episode.audioUrl) return null;
    return summaryAvailability.get(episode.audioUrl) || null;
  };

  const imageUrl = podcast?.artworkUrl?.replace('100x100', '600x600') || '/placeholder-podcast.png';

  if (error && !podcast) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Link href="/discover">
            <Button>Back to Discover</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header with Podcast Info */}
      <section className="bg-gradient-to-b from-primary/10 to-transparent py-8">
        <div className="container mx-auto px-4">
          <Link href="/discover">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Discover
            </Button>
          </Link>

          {isLoadingPodcast ? (
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="w-48 h-48 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ) : podcast && (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Artwork */}
              <div className="flex-shrink-0">
                <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src={imageUrl}
                    alt={podcast.name}
                    fill
                    className="object-cover"
                    priority
                    unoptimized={imageUrl.includes('mzstatic.com')}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Podcast</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{podcast.name}</h1>
                <p className="text-lg text-muted-foreground mb-3">{podcast.artistName}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {podcast.genres?.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                  {podcast.contentAdvisoryRating === 'Explicit' && (
                    <Badge variant="destructive">Explicit</Badge>
                  )}
                </div>

                {podcast.trackCount > 0 && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {podcast.trackCount} episodes
                  </p>
                )}

                <div className="flex gap-3">
                  {!isPiPodcast && (
                    <Button asChild>
                      <a
                        href={`https://podcasts.apple.com/podcast/id${podcast.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Apple className="h-4 w-4 mr-2" />
                        Open Podcast Page
                      </a>
                    </Button>
                  )}
                  {podcast.feedUrl && (
                    <Button variant={isPiPodcast ? 'default' : 'outline'} asChild>
                      <a
                        href={podcast.feedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        RSS Feed
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Episodes */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-6">Episodes</h2>

        {isLoadingEpisodes ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} variant="glass">
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
            <p className="text-muted-foreground">
              No episodes available. Episodes are fetched from the podcast RSS feed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {episodes.map((episode) => (
              <Card key={episode.id} variant="glass" className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Episode Artwork */}
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

                    {/* Episode Info */}
                    <div className="flex-1 min-w-0">
                      {/* Summary Ready Badge */}
                      {(() => {
                        const summaryInfo = getEpisodeSummaryInfo(episode);
                        const hasSummary = summaryInfo?.hasQuickSummary || summaryInfo?.hasDeepSummary;
                        return hasSummary ? (
                          <div className="mb-2">
                            <Badge variant="default" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              Summary Ready
                            </Badge>
                          </div>
                        ) : null;
                      })()}

                      {(() => {
                        const summaryInfo = getEpisodeSummaryInfo(episode);
                        const canNavigate = summaryInfo?.episodeId;
                        const title = (
                          <>
                            {episode.seasonNumber && episode.episodeNumber && (
                              <span className="text-muted-foreground text-sm mr-2">
                                S{episode.seasonNumber}E{episode.episodeNumber}
                              </span>
                            )}
                            {episode.title}
                          </>
                        );
                        return canNavigate ? (
                          <Link href={`/episode/${summaryInfo.episodeId}`}>
                            <h3 className="font-medium line-clamp-2 mb-1 hover:text-primary hover:underline cursor-pointer">
                              {title}
                            </h3>
                          </Link>
                        ) : (
                          <h3 className="font-medium line-clamp-2 mb-1">
                            {title}
                          </h3>
                        );
                      })()}

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
                        {episode.audioUrl && podcast && (
                          <InlinePlayButton
                            track={{
                              id: episode.id,
                              title: episode.title,
                              artist: podcast.name,
                              artworkUrl: episode.artworkUrl || podcast.artworkUrl,
                              audioUrl: episode.audioUrl,
                              duration: episode.duration,
                            }}
                          />
                        )}
                        {(() => {
                          const summaryInfo = getEpisodeSummaryInfo(episode);
                          const hasSummary = summaryInfo?.hasQuickSummary || summaryInfo?.hasDeepSummary;

                          // Determine initial status from actual DB state
                          const getInitialStatus = (): 'not_ready' | 'ready' | 'failed' | 'transcribing' | 'summarizing' | 'queued' => {
                            if (hasSummary) return 'ready';
                            const status = summaryInfo?.deepStatus || summaryInfo?.quickStatus;
                            if (status === 'transcribing') return 'transcribing';
                            if (status === 'summarizing') return 'summarizing';
                            if (status === 'queued') return 'queued';
                            if (status === 'failed') return 'failed';
                            return 'not_ready';
                          };

                          // Always use SummarizeButton when episodeId exists
                          if (summaryInfo?.episodeId) {
                            return (
                              <SummarizeButton
                                episodeId={summaryInfo.episodeId}
                                initialStatus={getInitialStatus()}
                              />
                            );
                          }

                          // Otherwise show import button
                          return (
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
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  className="rounded-full px-8"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${episodes.length} of ${totalCount})`
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
