'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { EpisodeLookupProvider } from '@/contexts/EpisodeLookupContext';
import { SemanticSearchBar } from '@/components/discovery/SemanticSearchBar';
import { DailyMixCarousel } from '@/components/discovery/DailyMixCarousel';
import { BrandShelf } from '@/components/discovery/BrandShelf';
import { CuriosityFeed } from '@/components/discovery/CuriosityFeed';
import { ApplePodcast } from '@/components/ApplePodcastCard';

interface FeedEpisode {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  audioUrl?: string;
  duration?: number;
  podcastId: string;
  podcastName: string;
  podcastArtist?: string;
  podcastArtwork: string;
  podcastFeedUrl?: string;
  isSubscribed: boolean;
}

// Memoized artwork URL transformer to avoid repeated string operations
const artworkCache = new Map<string, string>();
function getHighResArtwork(url: string | undefined): string {
  if (!url) return '';
  const cached = artworkCache.get(url);
  if (cached) return cached;
  const highRes = url.replace('100x100', '600x600');
  artworkCache.set(url, highRes);
  return highRes;
}

export default function DiscoverPage() {
  const { country } = useCountry();
  const { subscribedAppleIds } = useSubscription();

  // Data states
  const [topPodcasts, setTopPodcasts] = useState<ApplePodcast[]>([]);
  const [heroEpisodes, setHeroEpisodes] = useState<FeedEpisode[]>([]);
  const [feedEpisodes, setFeedEpisodes] = useState<FeedEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedPage, setFeedPage] = useState(0);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const isLoadingFeed = useRef(false);

  // Fetch initial data with optimized parallel loading
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Reset state on country change
      setFeedEpisodes([]);
      setHeroEpisodes([]);
      setFeedPage(0);
      setHasMoreFeed(true);
      isLoadingFeed.current = false;

      try {
        // Fetch top podcasts for brand shelf and hero
        const topRes = await fetch(`/api/apple/top?country=${country.toLowerCase()}&limit=30`);
        const topData = await topRes.json();
        const podcasts = topData.podcasts || [];
        setTopPodcasts(podcasts);

        // Start fetching hero episodes and initial feed in parallel
        const heroPodcasts = podcasts.slice(0, 5);

        // Fire both requests in parallel
        const [heroBatchRes] = await Promise.all([
          fetch('/api/apple/podcasts/batch-episodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              podcasts: heroPodcasts.map((p: ApplePodcast) => ({ podcastId: p.id, limit: 1 })),
              country: country.toLowerCase(),
            }),
          }),
          // Start loading feed in the background (non-blocking)
          loadMoreFeed(podcasts, 0),
        ]);

        const heroBatchData = await heroBatchRes.json();

        const heroEpisodesList = heroBatchData.results
          .filter((result: any) => result.success && result.episodes.length > 0)
          .map((result: any) => {
            const episode = result.episodes[0];
            const podcast = heroPodcasts.find((p: ApplePodcast) => p.id === result.podcastId);
            if (!podcast) return null;

            return {
              id: episode.id,
              title: episode.title,
              description: episode.description || '',
              publishedAt: new Date(episode.publishedAt),
              audioUrl: episode.audioUrl,
              duration: episode.duration,
              podcastId: podcast.id,
              podcastName: podcast.name,
              podcastArtist: podcast.artistName,
              podcastArtwork: getHighResArtwork(podcast.artworkUrl),
              podcastFeedUrl: podcast.feedUrl,
              isSubscribed: subscribedAppleIds.has(podcast.id),
            };
          })
          .filter(Boolean);

        setHeroEpisodes(heroEpisodesList as FeedEpisode[]);
      } catch (error) {
        console.error('Error fetching discover data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreFeed = useCallback(async (podcasts: ApplePodcast[], page: number) => {
    // Prevent concurrent loads
    if (isLoadingFeed.current) return;
    isLoadingFeed.current = true;

    const startIdx = page * 5 + 5; // Skip first 5 used in hero
    const endIdx = startIdx + 5;
    const podcastBatch = podcasts.slice(startIdx, endIdx);

    if (podcastBatch.length === 0) {
      setHasMoreFeed(false);
      isLoadingFeed.current = false;
      return;
    }

    // Fetch episodes using batch endpoint
    const batchRes = await fetch('/api/apple/podcasts/batch-episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        podcasts: podcastBatch.map((p: ApplePodcast) => ({ podcastId: p.id, limit: 3 })),
        country: country.toLowerCase(),
      }),
    });
    const batchData = await batchRes.json();

    const newEpisodes = batchData.results
      .filter((result: any) => result.success && result.episodes.length > 0)
      .flatMap((result: any) => {
        const podcast = podcastBatch.find((p: ApplePodcast) => p.id === result.podcastId);
        if (!podcast) return [];

        return result.episodes.map((episode: any) => ({
          id: episode.id,
          title: episode.title,
          description: episode.description || '',
          publishedAt: new Date(episode.publishedAt),
          audioUrl: episode.audioUrl,
          duration: episode.duration,
          podcastId: podcast.id,
          podcastName: podcast.name,
          podcastArtist: podcast.artistName,
          podcastArtwork: getHighResArtwork(podcast.artworkUrl),
          podcastFeedUrl: podcast.feedUrl,
          isSubscribed: subscribedAppleIds.has(podcast.id),
        }));
      })
      .sort((a: FeedEpisode, b: FeedEpisode) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Deduplicate episodes by composite key (podcastId-episodeId)
    setFeedEpisodes(prev => {
      const existingKeys = new Set(prev.map(ep => `${ep.podcastId}-${ep.id}`));
      const uniqueNewEpisodes = newEpisodes.filter(
        (ep: FeedEpisode) => !existingKeys.has(`${ep.podcastId}-${ep.id}`)
      );
      return [...prev, ...uniqueNewEpisodes];
    });
    setFeedPage(page + 1);
    isLoadingFeed.current = false;
  }, [country, subscribedAppleIds]);

  const handleLoadMore = useCallback(() => {
    if (hasMoreFeed && topPodcasts.length > 0) {
      loadMoreFeed(topPodcasts, feedPage);
    }
  }, [hasMoreFeed, topPodcasts, feedPage, loadMoreFeed]);

  return (
    <EpisodeLookupProvider>
      <div className="min-h-screen bg-background">
        {/* Sticky Semantic Search */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <SemanticSearchBar podcasts={topPodcasts} />
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
          {/* Daily Mix Hero */}
          <DailyMixCarousel episodes={heroEpisodes} isLoading={isLoading} />

          {/* Brand Shelf */}
          <BrandShelf podcasts={topPodcasts.slice(0, 15)} isLoading={isLoading} />

          {/* Curiosity Feed */}
          <CuriosityFeed
            episodes={feedEpisodes}
            isLoading={isLoading}
            hasMore={hasMoreFeed}
            onLoadMore={handleLoadMore}
          />
        </main>
      </div>
    </EpisodeLookupProvider>
  );
}
