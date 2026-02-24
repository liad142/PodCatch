'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplePodcastCard, ApplePodcast } from '@/components/ApplePodcastCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useCountry } from '@/contexts/CountryContext';
import { APPLE_PODCAST_GENRES } from '@/types/apple-podcasts';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

const INITIAL_COUNT = 30;
const LOAD_MORE_COUNT = 30;

export default function GenrePage({ params }: PageProps) {
  const { id: genreId } = use(params);
  const { country, countryInfo } = useCountry();

  const [podcasts, setPodcasts] = useState<ApplePodcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const genreName = APPLE_PODCAST_GENRES.find(g => g.id === genreId)?.name || 'Unknown Genre';

  const fetchPodcasts = useCallback(async (reset = false) => {
    if (reset) {
      setIsLoading(true);
      setOffset(0);
    }

    setError(null);
    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetch(
        `/api/apple/genres/${genreId}/podcasts?country=${country.toLowerCase()}&limit=${reset ? INITIAL_COUNT : LOAD_MORE_COUNT}`
      );
      if (!response.ok) throw new Error('Failed to fetch podcasts');
      const data = await response.json();
      const newPodcasts = data.podcasts || [];

      if (reset) {
        setPodcasts(newPodcasts);
      } else {
        // Filter out duplicates
        setPodcasts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newPodcasts.filter((p: ApplePodcast) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      }

      // iTunes RSS feed typically returns up to 200 items max
      setHasMore(newPodcasts.length === (reset ? INITIAL_COUNT : LOAD_MORE_COUNT) && currentOffset + newPodcasts.length < 200);
    } catch (err) {
      console.error('Error fetching genre podcasts:', err);
      setError('Failed to load podcasts');
    } finally {
      setIsLoading(false);
    }
  }, [genreId, country, offset]);

  // Initial fetch and refetch on country change
  useEffect(() => {
    fetchPodcasts(true);
  }, [genreId, country]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const newOffset = offset + LOAD_MORE_COUNT;
    setOffset(newOffset);

    try {
      const response = await fetch(
        `/api/apple/genres/${genreId}/podcasts?country=${country.toLowerCase()}&limit=${LOAD_MORE_COUNT}`
      );
      if (!response.ok) throw new Error('Failed to load more podcasts');
      const data = await response.json();
      const newPodcasts = data.podcasts || [];

      // Filter out duplicates
      setPodcasts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = newPodcasts.filter((p: ApplePodcast) => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });

      setHasMore(newPodcasts.length === LOAD_MORE_COUNT);
    } catch (err) {
      console.error('Error loading more podcasts:', err);
      setError('Failed to load more podcasts');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-card border-b border-border py-8 shadow-[var(--shadow-1)]">
        <div className="container mx-auto px-4">
          <Link href="/discover">
            <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Discover
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-primary bg-primary-subtle px-2 py-0.5 rounded-full uppercase tracking-wider">Category</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">{genreName}</h1>
              <p className="text-muted-foreground mt-2 flex items-center gap-2 font-medium">
                <Globe className="h-4 w-4" />
                Top podcasts in {genreName} • {countryInfo?.flag} {countryInfo?.name}
              </p>
            </div>

            {!isLoading && podcasts.length > 0 && (
              <div className="text-sm font-semibold text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border border-border">
                {podcasts.length} podcasts found
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-center mb-8">
            {error}
            <Button variant="outline" size="sm" className="ml-4" onClick={() => fetchPodcasts(true)}>
              Retry
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(INITIAL_COUNT)].map((_, i) => (
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
            title={`No ${genreName} Podcasts`}
            description={`We couldn't find any podcasts in ${genreName} for ${countryInfo?.name}. Try another country or genre.`}
            actionLabel="Browse All Genres"
            onAction={() => window.location.href = '/browse'}
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

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-8">
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

            {/* End of list indicator */}
            {!hasMore && podcasts.length > INITIAL_COUNT && (
              <div className="text-center pt-8 text-sm text-muted-foreground">
                You've reached the end • {podcasts.length} podcasts shown
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
