'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FeedItemCard from '@/components/FeedItemCard';
import { LoadingState } from '@/components/LoadingState';
import { glass } from '@/lib/glass';
import { useAuth } from '@/contexts/AuthContext';

type SourceType = 'all' | 'youtube' | 'podcast';
type FeedMode = 'latest' | 'following' | 'mixed';

interface FeedItem {
  id: string;
  sourceType: 'youtube' | 'podcast';
  sourceId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  duration?: number;
  url: string;
  videoId?: string;
  episodeId?: string;
  bookmarked: boolean;
  userId: string;
}

export default function FeedScreen() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<SourceType>('all');
  const [feedMode, setFeedMode] = useState<FeedMode>('latest');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        sourceType: sourceFilter,
        mode: feedMode,
        bookmarked: bookmarkedOnly.toString(),
        limit: '20',
        offset: currentOffset.toString(),
      });

      const response = await fetch(`/api/feed?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch feed');
      }

      if (reset) {
        setFeedItems(data.items);
        setOffset(20);
      } else {
        setFeedItems((prev) => [...prev, ...data.items]);
        setOffset((prev) => prev + 20);
      }

      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(true);
  }, [sourceFilter, feedMode, bookmarkedOnly]);

  const handleBookmarkToggle = async (itemId: string) => {
    try {
      // Find the current item to determine desired state (avoids server-side race condition)
      const currentItem = feedItems.find((item) => item.id === itemId);
      const desiredState = currentItem ? !currentItem.bookmarked : true;

      const response = await fetch(`/api/feed/${itemId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarked: desiredState }),
      });

      const data = await response.json();

      if (response.ok) {
        setFeedItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, bookmarked: data.bookmarked } : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchFeed(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Your Feed
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Stay updated with your favorite content
          </p>
        </div>

        {/* Filters */}
        <div className={`rounded-xl shadow-sm p-6 mb-6 ${glass.card}`}>
          {/* Feed Mode */}
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Feed Mode
            </label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={feedMode === 'latest' ? 'default' : 'glass-outline'}
                onClick={() => setFeedMode('latest')}
                className="rounded-full"
              >
                Latest Items
              </Button>
              <Button
                variant={feedMode === 'following' ? 'default' : 'glass-outline'}
                onClick={() => setFeedMode('following')}
                className="rounded-full"
              >
                Channels You Follow
              </Button>
              <Button
                variant={feedMode === 'mixed' ? 'default' : 'glass-outline'}
                onClick={() => setFeedMode('mixed')}
                className="rounded-full"
                disabled
              >
                Mixed (Coming Soon)
              </Button>
            </div>
          </div>

          {/* Source Type Filter */}
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Content Type
            </label>
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={sourceFilter === 'all' ? 'default' : 'glass'}
                onClick={() => setSourceFilter('all')}
                className="cursor-pointer px-4 py-2 text-sm"
              >
                All
              </Badge>
              <Badge
                variant={sourceFilter === 'youtube' ? 'default' : 'glass'}
                onClick={() => setSourceFilter('youtube')}
                className="cursor-pointer px-4 py-2 text-sm"
              >
                YouTube
              </Badge>
              <Badge
                variant={sourceFilter === 'podcast' ? 'default' : 'glass'}
                onClick={() => setSourceFilter('podcast')}
                className="cursor-pointer px-4 py-2 text-sm opacity-50"
              >
                Podcasts (Coming Soon)
              </Badge>
            </div>
          </div>

          {/* Bookmarked Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="bookmarked"
              checked={bookmarkedOnly}
              onChange={(e) => setBookmarkedOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label
              htmlFor="bookmarked"
              className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Bookmarked only
            </label>
          </div>
        </div>

        {/* Feed Items */}
        {loading && feedItems.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button onClick={() => fetchFeed(true)} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : feedItems.length === 0 ? (
          <div className={`rounded-xl shadow-sm p-12 text-center ${glass.card}`}>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No items in your feed yet.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Follow some YouTube channels to see content here!
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {feedItems.map((item) => (
                <FeedItemCard
                  key={item.id}
                  item={item}
                  onBookmarkToggle={handleBookmarkToggle}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loading}
                  variant="outline"
                  className="rounded-full px-8"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
