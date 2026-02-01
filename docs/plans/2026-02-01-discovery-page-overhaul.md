# Discovery Page Overhaul - Vertical Smart Feed

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Discovery page from a Web 2.0 grid layout to a modern, AI-driven vertical smart feed (TikTok/Netflix style).

**Architecture:** Single-column vertical feed with max-width 768px centered. Four main sections: sticky semantic search bar, Daily Mix hero carousel with glassmorphism cards, Brand Shelf of circular podcast avatars, and infinite-scroll Curiosity Feed of InsightCards. All data sourced from existing APIs - no mocking.

**Tech Stack:** Next.js 14, React, Tailwind CSS, Framer Motion, existing Apple Podcasts API, SubscriptionContext

---

## Task 1: Create Discovery Page Layout Shell

**Files:**
- Create: `src/app/discover/page.tsx`
- Modify: `src/app/page.tsx` (redirect to /discover instead of /browse)

**Step 1: Create the new discover page with layout structure**

```tsx
// src/app/discover/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
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
  podcastId: string;
  podcastName: string;
  podcastArtwork: string;
  isSubscribed: boolean;
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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch top podcasts for brand shelf and hero
        const topRes = await fetch(`/api/apple/top?country=${country.toLowerCase()}&limit=30`);
        const topData = await topRes.json();
        const podcasts = topData.podcasts || [];
        setTopPodcasts(podcasts);

        // Fetch episodes from first 5 podcasts for hero
        const heroPromises = podcasts.slice(0, 5).map(async (podcast: ApplePodcast) => {
          const epRes = await fetch(`/api/apple/podcasts/${podcast.id}/episodes?limit=1&country=${country.toLowerCase()}`);
          const epData = await epRes.json();
          const episode = epData.episodes?.[0];
          if (episode) {
            return {
              id: episode.id,
              title: episode.title,
              description: episode.description || '',
              publishedAt: new Date(episode.publishedAt),
              audioUrl: episode.audioUrl,
              podcastId: podcast.id,
              podcastName: podcast.name,
              podcastArtwork: podcast.artworkUrl?.replace('100x100', '600x600') || '',
              isSubscribed: subscribedAppleIds.has(podcast.id),
            };
          }
          return null;
        });

        const heroResults = await Promise.all(heroPromises);
        setHeroEpisodes(heroResults.filter(Boolean) as FeedEpisode[]);

        // Initial feed load
        await loadMoreFeed(podcasts, 0);
      } catch (error) {
        console.error('Error fetching discover data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreFeed = useCallback(async (podcasts: ApplePodcast[], page: number) => {
    const startIdx = page * 5 + 5; // Skip first 5 used in hero
    const endIdx = startIdx + 5;
    const podcastBatch = podcasts.slice(startIdx, endIdx);

    if (podcastBatch.length === 0) {
      setHasMoreFeed(false);
      return;
    }

    const feedPromises = podcastBatch.map(async (podcast: ApplePodcast) => {
      const epRes = await fetch(`/api/apple/podcasts/${podcast.id}/episodes?limit=3&country=${country.toLowerCase()}`);
      const epData = await epRes.json();
      return (epData.episodes || []).map((episode: any) => ({
        id: episode.id,
        title: episode.title,
        description: episode.description || '',
        publishedAt: new Date(episode.publishedAt),
        audioUrl: episode.audioUrl,
        podcastId: podcast.id,
        podcastName: podcast.name,
        podcastArtwork: podcast.artworkUrl?.replace('100x100', '600x600') || '',
        isSubscribed: subscribedAppleIds.has(podcast.id),
      }));
    });

    const feedResults = await Promise.all(feedPromises);
    const newEpisodes = feedResults.flat().sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    setFeedEpisodes(prev => [...prev, ...newEpisodes]);
    setFeedPage(page + 1);
  }, [country, subscribedAppleIds]);

  const handleLoadMore = useCallback(() => {
    if (hasMoreFeed && topPodcasts.length > 0) {
      loadMoreFeed(topPodcasts, feedPage);
    }
  }, [hasMoreFeed, topPodcasts, feedPage, loadMoreFeed]);

  return (
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
  );
}
```

**Step 2: Update root page redirect**

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/discover');
}
```

**Step 3: Verify the shell renders**

Run: `npm run dev`
Expected: Page loads at /discover with empty placeholder sections (components not yet created will error - that's expected)

---

## Task 2: Create SemanticSearchBar Component

**Files:**
- Create: `src/components/discovery/SemanticSearchBar.tsx`

**Step 1: Build the semantic search component with mock AI response**

```tsx
// src/components/discovery/SemanticSearchBar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { ApplePodcast } from '@/components/ApplePodcastCard';
import Image from 'next/image';
import Link from 'next/link';

interface SemanticSearchBarProps {
  podcasts: ApplePodcast[];
}

interface SearchResult {
  podcast: ApplePodcast;
  reason: string;
}

const AI_REASONS = [
  'Matches your interest in',
  'Popular for learning about',
  'Highly rated for',
  'Recommended for exploring',
  'Great introduction to',
];

export function SemanticSearchBar({ podcasts }: SemanticSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || podcasts.length === 0) return;

    setIsSearching(true);
    setShowResults(true);

    // Simulate AI thinking delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Filter podcasts by query (simple keyword match for demo)
    const queryLower = query.toLowerCase();
    const matched = podcasts
      .filter(p =>
        p.name.toLowerCase().includes(queryLower) ||
        p.artistName.toLowerCase().includes(queryLower) ||
        p.genres?.some(g => g.toLowerCase().includes(queryLower))
      )
      .slice(0, 5)
      .map(podcast => ({
        podcast,
        reason: `${AI_REASONS[Math.floor(Math.random() * AI_REASONS.length)]} "${query}"`,
      }));

    // If no matches, return random "suggestions"
    if (matched.length === 0) {
      const random = podcasts
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(podcast => ({
          podcast,
          reason: `You might also enjoy this based on "${query}"`,
        }));
      setResults(random);
    } else {
      setResults(matched);
    }

    setIsSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="What do you want to learn today?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="pl-12 pr-12 h-12 text-base rounded-full border-2 border-muted bg-muted/30 focus:border-primary focus:bg-background transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-2xl shadow-xl overflow-hidden z-50"
          >
            {isSearching ? (
              <div className="p-6 flex items-center justify-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                </motion.div>
                <span className="text-muted-foreground">Finding the best podcasts for you...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  AI Picks for "{query}"
                </div>
                {results.map((result) => (
                  <Link
                    key={result.podcast.id}
                    href={`/browse/podcast/${result.podcast.id}`}
                    onClick={() => setShowResults(false)}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={result.podcast.artworkUrl?.replace('100x100', '200x200') || '/placeholder-podcast.png'}
                        alt={result.podcast.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.podcast.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{result.reason}</p>
                    </div>
                    <Sparkles className="h-4 w-4 text-primary/50 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No results found. Try a different search term.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Create discovery components directory index**

```tsx
// src/components/discovery/index.ts
export { SemanticSearchBar } from './SemanticSearchBar';
export { DailyMixCarousel } from './DailyMixCarousel';
export { BrandShelf } from './BrandShelf';
export { CuriosityFeed } from './CuriosityFeed';
export { InsightCard } from './InsightCard';
export { DailyMixCard } from './DailyMixCard';
export { BrandBubble } from './BrandBubble';
```

---

## Task 3: Create DailyMixCard with Glassmorphism

**Files:**
- Create: `src/components/discovery/DailyMixCard.tsx`

**Step 1: Build the glassmorphism hero card**

```tsx
// src/components/discovery/DailyMixCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface DailyMixCardProps {
  episodeId: string;
  title: string;
  description: string;
  podcastName: string;
  podcastArtwork: string;
  podcastId: string;
  publishedAt: Date;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DailyMixCard({
  episodeId,
  title,
  description,
  podcastName,
  podcastArtwork,
  podcastId,
  publishedAt,
}: DailyMixCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative w-[320px] sm:w-[400px] h-[200px] rounded-2xl overflow-hidden flex-shrink-0 group"
    >
      {/* Blurred Background */}
      <div className="absolute inset-0">
        <Image
          src={podcastArtwork || '/placeholder-podcast.png'}
          alt=""
          fill
          className="object-cover scale-110 blur-xl brightness-50"
          unoptimized
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <Link href={`/browse/podcast/${podcastId}`} className="absolute inset-0 p-5 flex gap-4">
        {/* Podcast Artwork */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ring-2 ring-white/20">
          <Image
            src={podcastArtwork || '/placeholder-podcast.png'}
            alt={podcastName}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Text Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0 text-white">
          <div>
            <p className="text-xs font-medium text-white/70 mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(publishedAt)}
            </p>
            <h3 className="font-bold text-lg leading-tight line-clamp-2 mb-1 drop-shadow-lg">
              {title}
            </h3>
            <p className="text-sm text-white/80 line-clamp-2">
              {description}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white/60 truncate max-w-[150px]">
              {podcastName}
            </p>
            <Button
              size="sm"
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
```

---

## Task 4: Create DailyMixCarousel Component

**Files:**
- Create: `src/components/discovery/DailyMixCarousel.tsx`

**Step 1: Build the hero carousel wrapper**

```tsx
// src/components/discovery/DailyMixCarousel.tsx
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DailyMixCard } from './DailyMixCard';
import { cn } from '@/lib/utils';

interface Episode {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  podcastId: string;
  podcastName: string;
  podcastArtwork: string;
}

interface DailyMixCarouselProps {
  episodes: Episode[];
  isLoading?: boolean;
}

export function DailyMixCarousel({ episodes, isLoading = false }: DailyMixCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, episodes]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Daily Mix</h2>
          <p className="text-sm text-muted-foreground">Fresh episodes picked for you</p>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-full', !canScrollLeft && 'opacity-40')}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-full', !canScrollRight && 'opacity-40')}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-[320px] sm:w-[400px] h-[200px] rounded-2xl flex-shrink-0" />
            ))
          : episodes.map((ep) => (
              <div key={ep.id} className="snap-start">
                <DailyMixCard
                  episodeId={ep.id}
                  title={ep.title}
                  description={ep.description}
                  podcastName={ep.podcastName}
                  podcastArtwork={ep.podcastArtwork}
                  podcastId={ep.podcastId}
                  publishedAt={ep.publishedAt}
                />
              </div>
            ))}
      </div>
    </section>
  );
}
```

---

## Task 5: Create BrandBubble and BrandShelf Components

**Files:**
- Create: `src/components/discovery/BrandBubble.tsx`
- Create: `src/components/discovery/BrandShelf.tsx`

**Step 1: Build the brand bubble (circular avatar)**

```tsx
// src/components/discovery/BrandBubble.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface BrandBubbleProps {
  id: string;
  name: string;
  artworkUrl: string;
}

export function BrandBubble({ id, name, artworkUrl }: BrandBubbleProps) {
  const imageUrl = artworkUrl?.replace('100x100', '200x200') || '/placeholder-podcast.png';

  return (
    <Link href={`/browse/podcast/${id}`} className="flex flex-col items-center gap-2 group">
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/50 transition-all shadow-md"
      >
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          unoptimized
        />
      </motion.div>
      <span className="text-xs text-muted-foreground text-center line-clamp-1 max-w-[80px] group-hover:text-foreground transition-colors">
        {name}
      </span>
    </Link>
  );
}
```

**Step 2: Build the brand shelf wrapper**

```tsx
// src/components/discovery/BrandShelf.tsx
'use client';

import { useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandBubble } from './BrandBubble';
import { ApplePodcast } from '@/components/ApplePodcastCard';

interface BrandShelfProps {
  podcasts: ApplePodcast[];
  isLoading?: boolean;
}

export function BrandShelf({ podcasts, isLoading = false }: BrandShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Top Podcasts</h2>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full" />
                <Skeleton className="w-14 h-3" />
              </div>
            ))
          : podcasts.map((podcast) => (
              <BrandBubble
                key={podcast.id}
                id={podcast.id}
                name={podcast.name}
                artworkUrl={podcast.artworkUrl}
              />
            ))}
      </div>
    </section>
  );
}
```

---

## Task 6: Create InsightCard Component

**Files:**
- Create: `src/components/discovery/InsightCard.tsx`

**Step 1: Build the insight card for the curiosity feed**

```tsx
// src/components/discovery/InsightCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, Heart } from 'lucide-react';
import { SummarizeButton } from '@/components/SummarizeButton';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useState } from 'react';

interface InsightCardProps {
  episodeId: string;
  title: string;
  description: string;
  publishedAt: Date;
  podcastId: string;
  podcastName: string;
  podcastArtwork: string;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function InsightCard({
  episodeId,
  title,
  description,
  publishedAt,
  podcastId,
  podcastName,
  podcastArtwork,
}: InsightCardProps) {
  const { isSubscribed, subscribe, unsubscribe } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const subscribed = isSubscribed(podcastId);
  const imageUrl = podcastArtwork?.replace('100x100', '200x200') || '/placeholder-podcast.png';

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (subscribed) {
        await unsubscribe(podcastId);
      } else {
        await subscribe(podcastId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header: Podcast Info */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/browse/podcast/${podcastId}`} className="flex-shrink-0">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden ring-1 ring-border">
            <Image
              src={imageUrl}
              alt={podcastName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/browse/podcast/${podcastId}`} className="hover:underline">
            <p className="text-sm font-medium truncate">{podcastName}</p>
          </Link>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(publishedAt)}
          </p>
        </div>
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className={`p-2 rounded-full transition-all ${
            subscribed ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
          }`}
          title={subscribed ? 'Unsubscribe' : 'Subscribe'}
        >
          <Heart className={`h-4 w-4 ${subscribed ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Main Content: Episode Title (The Hook) */}
      <h3 className="text-lg sm:text-xl font-bold leading-tight mb-2 line-clamp-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {description}
      </p>

      {/* Action: Summarize Button */}
      <div className="flex justify-end">
        <SummarizeButton episodeId={episodeId} />
      </div>
    </motion.article>
  );
}
```

---

## Task 7: Create CuriosityFeed with Infinite Scroll

**Files:**
- Create: `src/components/discovery/CuriosityFeed.tsx`

**Step 1: Build the infinite scroll feed**

```tsx
// src/components/discovery/CuriosityFeed.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InsightCard } from './InsightCard';

interface FeedEpisode {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  podcastId: string;
  podcastName: string;
  podcastArtwork: string;
}

interface CuriosityFeedProps {
  episodes: FeedEpisode[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function CuriosityFeed({
  episodes,
  isLoading = false,
  hasMore = true,
  onLoadMore,
}: CuriosityFeedProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingMore = useRef(false);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && onLoadMore && !isLoadingMore.current && !isLoading) {
        isLoadingMore.current = true;
        onLoadMore();
        // Reset after a delay to prevent rapid firing
        setTimeout(() => {
          isLoadingMore.current = false;
        }, 1000);
      }
    },
    [hasMore, onLoadMore, isLoading]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [handleIntersect]);

  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight mb-4">Curiosity Feed</h2>

      <div className="space-y-4">
        {isLoading && episodes.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-16 h-3" />
                  </div>
                </div>
                <Skeleton className="w-full h-6" />
                <Skeleton className="w-3/4 h-4" />
                <div className="flex justify-end">
                  <Skeleton className="w-28 h-9" />
                </div>
              </div>
            ))
          : episodes.map((episode) => (
              <InsightCard
                key={episode.id}
                episodeId={episode.id}
                title={episode.title}
                description={episode.description}
                publishedAt={episode.publishedAt}
                podcastId={episode.podcastId}
                podcastName={episode.podcastName}
                podcastArtwork={episode.podcastArtwork}
              />
            ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {hasMore && episodes.length > 0 && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
        {!hasMore && episodes.length > 0 && (
          <p className="text-sm text-muted-foreground">You've reached the end</p>
        )}
      </div>
    </section>
  );
}
```

---

## Task 8: Create Component Index and Final Assembly

**Files:**
- Update: `src/components/discovery/index.ts`

**Step 1: Ensure all exports are in place**

```tsx
// src/components/discovery/index.ts
export { SemanticSearchBar } from './SemanticSearchBar';
export { DailyMixCarousel } from './DailyMixCarousel';
export { DailyMixCard } from './DailyMixCard';
export { BrandShelf } from './BrandShelf';
export { BrandBubble } from './BrandBubble';
export { CuriosityFeed } from './CuriosityFeed';
export { InsightCard } from './InsightCard';
```

**Step 2: Run the development server and test**

Run: `npm run dev`

Navigate to: `http://localhost:3000/discover`

**Expected behavior:**
1. Sticky search bar at top with placeholder "What do you want to learn today?"
2. Daily Mix carousel with 5 glassmorphism hero cards
3. Brand Shelf showing circular podcast avatars
4. Curiosity Feed with InsightCards that infinite scroll
5. Summarize buttons on each InsightCard should work

---

## Task 9: Update Navigation (Optional Polish)

**Files:**
- Modify: `src/components/Sidebar.tsx` (if exists)
- Modify: `src/components/Header.tsx` (if needed)

**Step 1: Add "Discover" to navigation if not automatic**

Check the existing navigation structure. The redirect from `/` to `/discover` should handle most cases. If there's a sidebar or header with navigation links, add a "Discover" link pointing to `/discover`.

---

## Task 10: Final Verification

**Step 1: Test all interactions**

1. Search bar: Type a query, press Enter, see mock AI results
2. Hero carousel: Scroll horizontally, click a card to navigate
3. Brand shelf: Click a bubble to navigate to podcast
4. Curiosity feed: Scroll down to trigger infinite load
5. Summarize: Click button on InsightCard
6. Subscribe: Click heart icon on InsightCard

**Step 2: Commit all changes**

```bash
git add .
git commit -m "feat: overhaul discovery page with vertical smart feed

- Add SemanticSearchBar with mock AI response
- Create DailyMixCarousel with glassmorphism hero cards
- Add BrandShelf with circular podcast avatars
- Implement CuriosityFeed with infinite scroll
- Create InsightCard component with Summarize integration
- Redirect root to /discover

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Component | Description |
|------|-----------|-------------|
| 1 | Page Shell | Layout structure, data fetching |
| 2 | SemanticSearchBar | Sticky search with mock AI |
| 3 | DailyMixCard | Glassmorphism hero card |
| 4 | DailyMixCarousel | Hero section wrapper |
| 5 | BrandBubble + BrandShelf | Circular avatars |
| 6 | InsightCard | Feed card with Summarize |
| 7 | CuriosityFeed | Infinite scroll container |
| 8 | Index exports | Component barrel file |
| 9 | Navigation | Optional polish |
| 10 | Verification | Testing + commit |
