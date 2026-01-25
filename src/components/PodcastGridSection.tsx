'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplePodcastCard, ApplePodcast } from '@/components/ApplePodcastCard';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

interface PodcastGridSectionProps {
  title: string;
  subtitle?: string;
  podcasts: ApplePodcast[];
  isLoading?: boolean;
  initialCount?: number;
  showLoadMore?: boolean;
  onLoadMore?: () => Promise<void>;
  seeAllHref?: string;
  emptyStateMessage?: string;
  className?: string;
}

export function PodcastGridSection({
  title,
  subtitle,
  podcasts,
  isLoading = false,
  initialCount = 30,
  showLoadMore = false,
  onLoadMore,
  seeAllHref,
  emptyStateMessage,
  className,
}: PodcastGridSectionProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    if (!onLoadMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <section className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {seeAllHref && podcasts.length > 0 && (
          <Link
            href={seeAllHref}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            See all
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: Math.min(initialCount, 18) }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : podcasts.length === 0 ? (
        <EmptyState
          type="podcasts"
          description={emptyStateMessage || 'No podcasts found'}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {podcasts.map((podcast, index) => (
              <ApplePodcastCard
                key={podcast.id}
                podcast={podcast}
                priority={index < 6}
              />
            ))}
          </div>

          {/* Load More / See All button */}
          {showLoadMore && onLoadMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="min-w-[200px]"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
