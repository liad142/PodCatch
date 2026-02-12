'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Clock, Calendar, Loader2, FileText, Heart } from 'lucide-react';
import { SummarizeButton } from '@/components/SummarizeButton';
import { InlinePlayButton } from '@/components/PlayButton';
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
  const { user, setShowCompactPrompt } = useAuth();
  const { subscribedAppleIds, subscribe, unsubscribe } = useSubscription();

  // Detect if this is a Podcastindex-only podcast (pi:{feedId} format)
  const isPiPodcast = podcastId.startsWith('pi:');
  const piFeedId = isPiPodcast ? podcastId.slice(3) : null;

  const isSubscribed = !isPiPodcast && subscribedAppleIds.has(podcastId);
  const [isTogglingSubscription, setIsTogglingSubscription] = useState(false);

  const handleToggleSubscription = async () => {
    if (!user) {
      setShowCompactPrompt(true, 'Sign in to save podcasts to your library.');
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

  if (error && !podcast) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/discover">
          <Button variant="ghost" className="mb-6 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discover
          </Button>
        </Link>

        {isLoadingPodcast ? (
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-3xl bg-slate-200 h-96 animate-pulse" />
          </div>
        ) : podcast && (
          <div className="space-y-12">
            {/* Immersive Header */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-2xl">
              {/* Blurred Background Backdrop */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  className="object-cover blur-3xl scale-110 opacity-50"
                  unoptimized={imageUrl.includes('mzstatic.com')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
              </div>

              {/* Content Overlay */}
              <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                {/* Podcast Cover */}
                <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 rotate-1 md:rotate-0 transition-transform hover:scale-105 duration-500 group">
                  <Image
                    src={imageUrl}
                    alt={podcast.name}
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                    priority
                    unoptimized={imageUrl.includes('mzstatic.com')}
                  />
                </div>

                <div className="flex-1 space-y-6 max-w-3xl">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                      <Badge className="bg-white/10 text-white hover:bg-white/20 border-0 backdrop-blur-md">
                        Podcast
                      </Badge>
                      {podcast.contentAdvisoryRating === 'Explicit' && (
                        <Badge variant="destructive" className="border-0">Explicit</Badge>
                      )}
                    </div>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                      {podcast.name}
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-200 font-medium tracking-wide">
                      {podcast.artistName}
                    </p>
                  </div>

                  {/* Metadata Pills */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    {podcast.trackCount > 0 && (
                      <div className="px-3 py-1.5 rounded-full bg-slate-800/50 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        {podcast.trackCount} episodes
                      </div>
                    )}
                    {podcast.genres?.slice(0, 3).map((genre) => (
                      <div key={genre} className="px-3 py-1.5 rounded-full bg-slate-800/50 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-300">
                        {genre}
                      </div>
                    ))}
                  </div>

                  {/* Description (Collapsed) */}
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base border-l-2 border-violet-500/50 pl-4 line-clamp-3 md:line-clamp-4 max-w-2xl">
                    {podcast.description}
                  </p>

                  <div className="flex items-center gap-4 pt-2 justify-center md:justify-start">
                    {/* Subscribe Button */}
                    {!isPiPodcast && (
                      <Button
                        size="lg"
                        onClick={handleToggleSubscription}
                        disabled={isTogglingSubscription}
                        className={cn(
                          'rounded-full px-8 h-12 font-semibold shadow-xl transition-all hover:scale-105',
                          isSubscribed
                            ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                            : 'bg-white text-slate-900 hover:bg-slate-100'
                        )}
                      >
                        {isTogglingSubscription ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Heart className={cn('h-5 w-5 mr-2', isSubscribed && 'fill-rose-500 text-rose-500')} />
                        )}
                        {isSubscribed ? 'Saved to Library' : 'Follow Podcast'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Episodes Section */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                  Latest Episodes
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                    {totalCount}
                  </Badge>
                </h2>
              </div>

              {isLoadingEpisodes ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                      <div className="flex gap-6">
                        <Skeleton className="w-16 h-16 rounded-xl shrink-0 bg-slate-100" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-5 w-2/3 bg-slate-100" />
                          <Skeleton className="h-4 w-full bg-slate-100" />
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-24 rounded-full bg-slate-100" />
                            <Skeleton className="h-8 w-24 rounded-full bg-slate-100" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : episodes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-lg font-medium text-slate-900 mb-1">No episodes found</p>
                  <p className="text-slate-500">Check back later for new content.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {episodes.map((episode) => {
                    const summaryInfo = getEpisodeSummaryInfo(episode);
                    const hasSummary = summaryInfo?.hasQuickSummary || summaryInfo?.hasDeepSummary;
                    const canNavigate = summaryInfo?.episodeId;

                    return (
                      <div
                        key={episode.id}
                        className="group bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.06)] border border-slate-100 hover:border-violet-100 transition-all duration-300"
                      >
                        <div className="flex gap-5 items-start">
                          {/* Episode Thumbnail */}
                          <div className="shrink-0 hidden sm:block">
                            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden relative group-hover:scale-105 transition-transform duration-500">
                              {episode.artworkUrl ? (
                                <Image
                                  src={episode.artworkUrl.replace('100x100', '200x200')}
                                  alt={episode.title}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <FileText className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Meta Row */}
                            <div className="flex items-center gap-3 text-xs font-semibold tracking-wide text-slate-400 mb-2 uppercase">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                {formatDate(episode.publishedAt)}
                              </span>
                              {episode.duration > 0 && (
                                <>
                                  <span className="w-0.5 h-3 bg-slate-200" />
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(episode.duration)}
                                  </span>
                                </>
                              )}
                              {hasSummary && (
                                <span className="ml-auto flex items-center gap-1 text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full normal-case">
                                  <FileText className="h-3 w-3 fill-violet-600/20" />
                                  Summary Ready
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            {canNavigate ? (
                              <Link href={`/episode/${summaryInfo.episodeId}`}>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2 group-hover:text-violet-700 transition-colors line-clamp-2">
                                  {episode.title}
                                </h3>
                              </Link>
                            ) : (
                              <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2 line-clamp-2">
                                {episode.title}
                              </h3>
                            )}

                            {/* Description */}
                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-4 pr-4">
                              {episode.description}
                            </p>

                            {/* Action Bar */}
                            <div className="flex items-center gap-3">
                              {/* Summarize Button */}
                              <div className="shadow-sm">
                                {(() => {
                                  // Determine status logic (same as before)
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
                                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-violet-200 hover:text-violet-700 rounded-full h-9 px-4 gap-2 transition-all"
                                      size="sm"
                                      onClick={() => handleSummarize(episode)}
                                      disabled={importingEpisodeId === episode.id}
                                    >
                                      {importingEpisodeId === episode.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <FileText className="h-3.5 w-3.5" />
                                      )}
                                      {importingEpisodeId === episode.id ? 'Importing' : 'Summarize'}
                                    </Button>
                                  );
                                })()}
                              </div>

                              {/* Play Button */}
                              {episode.audioUrl && podcast && (
                                <div className="opacity-60 group-hover:opacity-100 transition-opacity">
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
                                </div>
                              )}
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
                    className="rounded-full px-8 h-10 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white shadow-sm"
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
