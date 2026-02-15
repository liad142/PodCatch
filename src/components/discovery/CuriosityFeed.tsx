'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InsightCard } from './InsightCard';
import { glass } from '@/lib/glass';

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
            <div key={i} className="bg-card border border-border shadow-sm dark:shadow-none rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl bg-muted" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="w-1/3 h-4 bg-muted" />
                  <Skeleton className="w-1/4 h-3 bg-muted" />
                </div>
              </div>
              <Skeleton className="w-3/4 h-6 bg-muted" />
              <div className="space-y-2">
                <Skeleton className="w-full h-4 bg-muted" />
                <Skeleton className="w-5/6 h-4 bg-muted" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <Skeleton className="w-16 h-6 rounded-full bg-muted" />
                  <Skeleton className="w-16 h-6 rounded-full bg-muted" />
                </div>
                <Skeleton className="w-24 h-9 rounded-lg bg-muted" />
              </div>
            </div>
          ))
          : episodes.map((episode) => (
            <InsightCard
              key={`${episode.podcastId}-${episode.id}`}
              episodeId={episode.id}
              title={episode.title}
              description={episode.description}
              publishedAt={episode.publishedAt}
              audioUrl={episode.audioUrl}
              duration={episode.duration}
              podcastId={episode.podcastId}
              podcastName={episode.podcastName}
              podcastArtist={episode.podcastArtist}
              podcastArtwork={episode.podcastArtwork}
              podcastFeedUrl={episode.podcastFeedUrl}
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
