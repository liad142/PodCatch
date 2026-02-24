'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoCard } from '@/components/VideoCard';
import type { VideoItem } from '@/components/VideoCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'youtube' | 'podcast';

interface FeedItemRaw {
  id: string;
  source_type: 'youtube' | 'podcast';
  source_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  published_at: string;
  duration?: number;
  url: string;
  video_id?: string;
  episode_id?: string;
  bookmarked: boolean;
}

export function UnifiedFeed() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [items, setItems] = useState<FeedItemRaw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const PAGE_SIZE = 20;

  const fetchFeed = useCallback(async (sourceType: FilterType, offset: number, append: boolean) => {
    if (!user) return;

    const params = new URLSearchParams({
      sourceType,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });

    console.log(`[FEED_UI] Fetching: sourceType=${sourceType} offset=${offset} append=${append}`);

    try {
      const res = await fetch(`/api/feed?${params}`);
      if (!res.ok) {
        console.error(`[FEED_UI] API error: ${res.status} ${res.statusText}`);
        return;
      }

      const data = await res.json();
      const newItems: FeedItemRaw[] = data.items || [];

      console.log(`[FEED_UI] Received ${newItems.length} items (hasMore=${data.hasMore})`);

      setItems(prev => append ? [...prev, ...newItems] : newItems);
      setHasMore(newItems.length === PAGE_SIZE);
      offsetRef.current = offset + newItems.length;
    } catch (err) {
      console.error('[FEED_UI] Error fetching feed:', err);
    }
  }, [user]);

  // Load initial feed
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    offsetRef.current = 0;
    fetchFeed(filter, 0, false).finally(() => setIsLoading(false));
  }, [user, filter, fetchFeed]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await fetchFeed(filter, offsetRef.current, true);
    setIsLoadingMore(false);
  }, [filter, isLoadingMore, hasMore, fetchFeed]);

  const mapToVideoItem = (item: FeedItemRaw): VideoItem => ({
    videoId: item.video_id || item.id,
    title: item.title,
    description: item.description,
    thumbnailUrl: item.thumbnail_url || '',
    publishedAt: item.published_at,
    url: item.url,
    duration: item.duration,
    bookmarked: item.bookmarked,
  });

  if (!user) return null;

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Podcasts', value: 'podcast' },
    { label: 'YouTube', value: 'youtube' },
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Feed</h2>
        <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                filter === f.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No items in your feed yet.</p>
          <p className="text-sm mt-1">Follow some YouTube channels to get started!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items
              .filter(item => item.source_type === 'youtube')
              .map((item) => (
                <VideoCard
                  key={item.id}
                  video={mapToVideoItem(item)}
                />
              ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="gap-2"
              >
                {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
