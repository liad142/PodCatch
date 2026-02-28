'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Image from 'next/image';
import { SafeImage } from '@/components/SafeImage';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar, Loader2, FileText, Heart, Share2, Sparkles } from 'lucide-react';
import { SummarizeButton } from '@/components/SummarizeButton';
import { PlayButton, InlinePlayButton } from '@/components/PlayButton';
import { useSummarizeQueue } from '@/contexts/SummarizeQueueContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';

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
  const { user, setShowAuthModal } = useAuth();
  const { subscribedAppleIds, subscribe, unsubscribe } = useSubscription();

  // Detect if this is a Podcastindex-only podcast (pi:{feedId} format)
  const isPiPodcast = podcastId.startsWith('pi:');
  const piFeedId = isPiPodcast ? podcastId.slice(3) : null;

  const isSubscribed = !isPiPodcast && subscribedAppleIds.has(podcastId);
  const [isTogglingSubscription, setIsTogglingSubscription] = useState(false);

  const handleToggleSubscription = async () => {
    if (!user) {
      setShowAuthModal(true, 'Sign up to follow your favourite podcasts and never miss an episode.');
      return;
    }
    setIsTogglingSubscription(true);
    try {
      if (isSubscribed) {
        await unsubscribe(podcastId);
      } else {
        await subscribe(podcastId);
      }
    } finally {
      setIsTogglingSubscription(false);
    }
  };

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

  // Helper for consistent image URL
  const imageUrl = podcast?.artworkUrl?.replace('100x100', '600x600') || '/placeholder-podcast.png';

  const handleShare = async () => {
    if (typeof navigator.share === 'function' && podcast) {
      try {
        await navigator.share({ title: podcast.name, url: window.location.href });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  if (error && !podcast) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/discover">
          <Button variant="ghost" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discover
          </Button>
        </Link>

        {isLoadingPodcast ? (
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl bg-secondary h-80 animate-pulse" />
          </div>
        ) : podcast && (
          <div className="space-y-12">
            {/* Podcast Header */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Podcast Artwork */}
              <div className="w-40 h-40 shrink-0 rounded-2xl overflow-hidden shadow-[var(--shadow-3)]">
                <SafeImage
                  src={imageUrl}
                  alt={podcast.name}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>

              <div className="flex-1 space-y-4 text-center md:text-left max-w-3xl">
                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight">
                  {podcast.name}
                </h1>

                {/* Publisher */}
                <p className="text-base text-muted-foreground">
                  {podcast.artistName}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {podcast.contentAdvisoryRating === 'Explicit' && (
                    <Badge variant="destructive">Explicit</Badge>
                  )}
                  {podcast.genres?.slice(0, 3).map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <p className="text-sm text-muted-foreground">
                  {podcast.trackCount > 0 && `${podcast.trackCount} episodes`}
                </p>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 md:line-clamp-4 max-w-2xl">
                  {podcast.description}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2 justify-center md:justify-start">
                  {/* Follow button */}
                  {!isPiPodcast && (
                    <Button
                      size="lg"
                      onClick={handleToggleSubscription}
                      disabled={isTogglingSubscription}
                      className={cn(
                        'rounded-full px-8 font-semibold transition-all',
                        isSubscribed
                          ? 'bg-secondary text-foreground hover:bg-secondary/80'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      )}
                    >
                      {isTogglingSubscription ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Heart className={cn('h-5 w-5 mr-2', isSubscribed && 'fill-current')} />
                      )}
                      {isSubscribed ? 'Saved to Library' : 'Follow Podcast'}
                    </Button>
                  )}

                  {/* Share button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className="rounded-full"
                    aria-label="Share podcast"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Episodes Section */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  Latest Episodes
                  <Badge variant="secondary">
                    {totalCount}
                  </Badge>
                </h2>
              </div>

              {isLoadingEpisodes ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="rounded-xl p-4 border border-border">
                      <div className="flex gap-5">
                        <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-5 w-2/3" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-24 rounded-full" />
                            <Skeleton className="h-8 w-24 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : episodes.length === 0 ? (
                <div className="text-center py-20 rounded-2xl border border-border">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-1">No episodes found</p>
                  <p className="text-muted-foreground">Check back later for new content.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {episodes.map((episode) => {
                    const summaryInfo = getEpisodeSummaryInfo(episode);
                    const hasSummary = summaryInfo?.hasQuickSummary || summaryInfo?.hasDeepSummary;
                    const canNavigate = summaryInfo?.episodeId;

                    return (
                      <div
                        key={episode.id}
                        className="group py-4 border-b border-border hover:bg-secondary rounded-xl px-4 -mx-4 transition-colors cursor-pointer"
                      >
                        <div className="flex gap-4 items-start">
                          {/* Episode Thumbnail */}
                          <div className="shrink-0 hidden sm:block">
                            <div className="w-14 h-14 rounded-lg bg-secondary border border-border overflow-hidden relative">
                              {episode.artworkUrl ? (
                                <SafeImage
                                  src={episode.artworkUrl.replace('100x100', '200x200')}
                                  alt={episode.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <FileText className="h-5 w-5" />
                                </div>
                              )}
                              {/* Summary-ready indicator */}
                              {hasSummary && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Meta Row */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(episode.publishedAt)}
                              </span>
                              {episode.duration > 0 && (
                                <>
                                  <span className="w-px h-3 bg-border" />
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(episode.duration)}
                                  </span>
                                </>
                              )}
                              {/* Summary dot on mobile (no thumbnail) */}
                              {hasSummary && (
                                <span className="sm:hidden w-2 h-2 rounded-full bg-green-500 shrink-0" />
                              )}
                            </div>

                            {/* Title */}
                            {canNavigate ? (
                              <Link href={`/episode/${summaryInfo.episodeId}`}>
                                <h3 className="text-base font-semibold text-foreground leading-tight mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
                                  {episode.title}
                                </h3>
                              </Link>
                            ) : (
                              <h3 className="text-base font-semibold text-foreground leading-tight mb-1.5 line-clamp-2">
                                {episode.title}
                              </h3>
                            )}

                            {/* Description */}
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                              {episode.description}
                            </p>

                            {/* Action Bar */}
                            <div className="flex items-center gap-2">
                              {/* Play */}
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
                                  className="shrink-0 px-5 text-sm"
                                />
                              )}

                              {/* Summarize */}
                              {(() => {
                                const getInitialStatus = (): any => {
                                  if (hasSummary) return 'ready';
                                  const status = summaryInfo?.deepStatus || summaryInfo?.quickStatus;
                                  if (status === 'transcribing') return 'transcribing';
                                  if (status === 'summarizing') return 'summarizing';
                                  if (status === 'queued') return 'queued';
                                  if (status === 'failed') return 'failed';
                                  return 'not_ready';
                                };

                                if (summaryInfo?.episodeId) {
                                  return (
                                    <SummarizeButton
                                      episodeId={summaryInfo.episodeId}
                                      initialStatus={getInitialStatus()}
                                    />
                                  );
                                }

                                return (
                                  <Button
                                    className="gap-2 rounded-full px-5 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                                    size="sm"
                                    onClick={() => handleSummarize(episode)}
                                    disabled={importingEpisodeId === episode.id}
                                  >
                                    {importingEpisodeId === episode.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-4 w-4" />
                                    )}
                                    {importingEpisodeId === episode.id ? 'Importing...' : 'Summarize'}
                                  </Button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Load More */}
              {hasMore && (
                <div className="mt-12 text-center pb-12">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    variant="outline"
                    className="rounded-full px-8 h-10"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading episodes...
                      </>
                    ) : (
                      `Load More Episodes`
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
