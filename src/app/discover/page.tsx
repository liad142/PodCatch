'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
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

function mapEpisodes(results: any[], podcasts: ApplePodcast[], subscribedAppleIds: Set<string>): FeedEpisode[] {
  return results
    .filter((result: any) => result.success && result.episodes?.length > 0)
    .flatMap((result: any) => {
      const podcast = podcasts.find((p: ApplePodcast) => p.id === result.podcastId);
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
    .sort((a: FeedEpisode, b: FeedEpisode) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
}

interface PersonalizedSection {
  genreId: string;
  genreName: string;
  label: string;
  podcasts: ApplePodcast[];
}

export default function DiscoverPage() {
  const { country } = useCountry();
  const { subscribedAppleIds } = useSubscription();
  const { user } = useAuth();

  // PROGRESSIVE loading states - each section loads independently
  const [topPodcasts, setTopPodcasts] = useState<ApplePodcast[]>([]);
  const [heroEpisodes, setHeroEpisodes] = useState<FeedEpisode[]>([]);
  const [feedEpisodes, setFeedEpisodes] = useState<FeedEpisode[]>([]);
  const [isLoadingPodcasts, setIsLoadingPodcasts] = useState(true);
  const [isLoadingHero, setIsLoadingHero] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [feedPage, setFeedPage] = useState(0);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const isLoadingMoreFeed = useRef(false);
  const allPodcastsRef = useRef<ApplePodcast[]>([]);
  const [personalizedSections, setPersonalizedSections] = useState<PersonalizedSection[]>([]);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState(false);

  // Phase 1: Fetch top podcasts (shows Brand Shelf immediately when ready)
  // Phase 2: Fetch hero episodes (shows Daily Mix when ready)
  // Phase 3: Fetch feed episodes (shows Curiosity Feed when ready)
  // Each phase renders independently - no waiting for all data
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      // Reset all states
      setTopPodcasts([]);
      setHeroEpisodes([]);
      setFeedEpisodes([]);
      setIsLoadingPodcasts(true);
      setIsLoadingHero(true);
      setIsLoadingFeed(true);
      setFeedPage(0);
      setHasMoreFeed(true);
      isLoadingMoreFeed.current = false;
      allPodcastsRef.current = [];

      try {
        // PHASE 1: Fetch top podcasts from BOTH countries in parallel
        // This is the fastest call (cached after first load)
        const [primaryRes, usRes] = await Promise.allSettled([
          fetch(`/api/apple/top?country=${country.toLowerCase()}&limit=30`),
          country.toLowerCase() !== 'us'
            ? fetch(`/api/apple/top?country=us&limit=30`)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        let allPodcasts: ApplePodcast[] = [];

        // Primary country podcasts
        if (primaryRes.status === 'fulfilled' && primaryRes.value) {
          const data = await primaryRes.value.json();
          allPodcasts = data.podcasts || [];
        }

        // Merge US podcasts if different country (deduplicated)
        if (usRes.status === 'fulfilled' && usRes.value) {
          const usData = await usRes.value.json();
          const usPodcasts = usData.podcasts || [];
          const existingIds = new Set(allPodcasts.map((p: ApplePodcast) => p.id));
          const uniqueUs = usPodcasts.filter((p: ApplePodcast) => !existingIds.has(p.id));
          allPodcasts = [...allPodcasts, ...uniqueUs];
        }

        // IMMEDIATELY show Brand Shelf - no waiting for episodes
        setTopPodcasts(allPodcasts);
        setIsLoadingPodcasts(false);
        allPodcastsRef.current = allPodcasts;

        if (cancelled || allPodcasts.length === 0) {
          setIsLoadingHero(false);
          setIsLoadingFeed(false);
          return;
        }

        // PHASE 2 & 3: Fetch hero + feed episodes IN PARALLEL
        // Hero: first 5 podcasts, 1 episode each
        // Feed: next 5 podcasts, 3 episodes each
        const heroPodcasts = allPodcasts.slice(0, 5);
        const feedPodcasts = allPodcasts.slice(5, 10);

        const [heroRes, feedRes] = await Promise.allSettled([
          fetch('/api/apple/podcasts/batch-episodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              podcasts: heroPodcasts.map((p: ApplePodcast) => ({ podcastId: p.id, limit: 1 })),
              country: country.toLowerCase(),
            }),
          }),
          fetch('/api/apple/podcasts/batch-episodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              podcasts: feedPodcasts.map((p: ApplePodcast) => ({ podcastId: p.id, limit: 3 })),
              country: country.toLowerCase(),
            }),
          }),
        ]);

        if (cancelled) return;

        // Show hero as soon as it's ready
        if (heroRes.status === 'fulfilled') {
          const heroData = await heroRes.value.json();
          setHeroEpisodes(mapEpisodes(heroData.results, heroPodcasts, subscribedAppleIds));
        }
        setIsLoadingHero(false);

        // Show feed as soon as it's ready
        if (feedRes.status === 'fulfilled') {
          const feedData = await feedRes.value.json();
          setFeedEpisodes(mapEpisodes(feedData.results, feedPodcasts, subscribedAppleIds));
          setFeedPage(1);
        }
        setIsLoadingFeed(false);

      } catch (error) {
        console.error('Error fetching discover data:', error);
        setIsLoadingPodcasts(false);
        setIsLoadingHero(false);
        setIsLoadingFeed(false);
      }
    };

    fetchData();

    return () => { cancelled = true; };
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch personalized recommendations for authenticated users
  useEffect(() => {
    if (!user) {
      setPersonalizedSections([]);
      return;
    }

    const fetchPersonalized = async () => {
      setIsLoadingPersonalized(true);
      try {
        const response = await fetch(`/api/discover/personalized?country=${country.toLowerCase()}`);
        const data = await response.json();
        if (data.personalized && data.sections) {
          setPersonalizedSections(data.sections);
        } else {
          setPersonalizedSections([]);
        }
      } catch (error) {
        console.error('Error fetching personalized feed:', error);
        setPersonalizedSections([]);
      } finally {
        setIsLoadingPersonalized(false);
      }
    };

    fetchPersonalized();
  }, [user, country]);

  const loadMoreFeed = useCallback(async (podcasts: ApplePodcast[], page: number) => {
    if (isLoadingMoreFeed.current) return;
    isLoadingMoreFeed.current = true;

    const startIdx = page * 5 + 5; // Skip first 5 used in hero
    const endIdx = startIdx + 5;
    const podcastBatch = podcasts.slice(startIdx, endIdx);

    if (podcastBatch.length === 0) {
      setHasMoreFeed(false);
      isLoadingMoreFeed.current = false;
      return;
    }

    try {
      const batchRes = await fetch('/api/apple/podcasts/batch-episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcasts: podcastBatch.map((p: ApplePodcast) => ({ podcastId: p.id, limit: 3 })),
          country: country.toLowerCase(),
        }),
      });
      const batchData = await batchRes.json();
      const newEpisodes = mapEpisodes(batchData.results, podcastBatch, subscribedAppleIds);

      setFeedEpisodes(prev => {
        const existingKeys = new Set(prev.map(ep => `${ep.podcastId}-${ep.id}`));
        const unique = newEpisodes.filter(
          (ep: FeedEpisode) => !existingKeys.has(`${ep.podcastId}-${ep.id}`)
        );
        return [...prev, ...unique];
      });
      setFeedPage(page + 1);
    } catch (error) {
      console.error('Error loading more feed:', error);
    } finally {
      isLoadingMoreFeed.current = false;
    }
  }, [country, subscribedAppleIds]);

  const handleLoadMore = useCallback(() => {
    if (hasMoreFeed && allPodcastsRef.current.length > 0) {
      loadMoreFeed(allPodcastsRef.current, feedPage);
    }
  }, [hasMoreFeed, feedPage, loadMoreFeed]);

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
          {/* Daily Mix Hero - shows when hero episodes are ready */}
          <DailyMixCarousel episodes={heroEpisodes} isLoading={isLoadingHero} />

          {/* Personalized Sections - for authenticated users with genre preferences */}
          {personalizedSections.length > 0 && personalizedSections.map((section) => (
            <BrandShelf
              key={section.genreId}
              podcasts={section.podcasts}
              isLoading={false}
              title={section.label}
            />
          ))}

          {/* Brand Shelf - shows as soon as top podcasts load (fastest) */}
          <BrandShelf podcasts={topPodcasts.slice(0, 15)} isLoading={isLoadingPodcasts} />

          {/* Curiosity Feed - shows when feed episodes are ready */}
          <CuriosityFeed
            episodes={feedEpisodes}
            isLoading={isLoadingFeed}
            hasMore={hasMoreFeed}
            onLoadMore={handleLoadMore}
          />
        </main>
      </div>
    </EpisodeLookupProvider>
  );
}
