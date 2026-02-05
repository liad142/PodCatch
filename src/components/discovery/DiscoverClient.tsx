'use client';

import { useState, useCallback, useRef } from 'react';
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

interface DiscoverClientProps {
  initialTopPodcasts: ApplePodcast[];
  initialHeroEpisodes: FeedEpisode[];
  initialFeedEpisodes: FeedEpisode[];
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

export function DiscoverClient({
  initialTopPodcasts,
  initialHeroEpisodes,
  initialFeedEpisodes,
}: DiscoverClientProps) {
  const { country } = useCountry();
  const { subscribedAppleIds } = useSubscription();

  // Data states
  const [topPodcasts] = useState<ApplePodcast[]>(initialTopPodcasts);
  const [heroEpisodes] = useState<FeedEpisode[]>(initialHeroEpisodes);
  const [feedEpisodes, setFeedEpisodes] = useState<FeedEpisode[]>(initialFeedEpisodes);
  const [feedPage, setFeedPage] = useState(1); // Start at 1 since we already loaded page 0
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const isLoadingFeed = useRef(false);

  const loadMoreFeed = useCallback(async (page: number) => {
    // Prevent concurrent loads
    if (isLoadingFeed.current) return;
    isLoadingFeed.current = true;

    const startIdx = page * 5 + 5; // Skip first 5 used in hero
    const endIdx = startIdx + 5;
    const podcastBatch = topPodcasts.slice(startIdx, endIdx);

    if (podcastBatch.length === 0) {
      setHasMoreFeed(false);
      isLoadingFeed.current = false;
      return;
    }

    try {
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
    } catch (error) {
      console.error('Error loading more feed:', error);
    } finally {
      isLoadingFeed.current = false;
    }
  }, [country, subscribedAppleIds, topPodcasts]);

  const handleLoadMore = useCallback(() => {
    if (hasMoreFeed && topPodcasts.length > 0) {
      loadMoreFeed(feedPage);
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
          <DailyMixCarousel episodes={heroEpisodes} isLoading={false} />

          {/* Brand Shelf */}
          <BrandShelf podcasts={topPodcasts.slice(0, 15)} isLoading={false} />

          {/* Curiosity Feed */}
          <CuriosityFeed
            episodes={feedEpisodes}
            isLoading={false}
            hasMore={hasMoreFeed}
            onLoadMore={handleLoadMore}
          />
        </main>
      </div>
    </EpisodeLookupProvider>
  );
}
