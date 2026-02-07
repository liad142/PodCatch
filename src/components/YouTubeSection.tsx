'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Youtube, TrendingUp, Users, Loader2, RefreshCw, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoCard, VideoItem } from '@/components/VideoCard';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type YouTubeTab = 'trending' | 'followed';

interface YouTubeSectionProps {
  initialTab?: YouTubeTab;
  itemsPerPage?: number;
  className?: string;
}

export function YouTubeSection({
  initialTab = 'trending',
  itemsPerPage = 12,
  className,
}: YouTubeSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<YouTubeTab>(initialTab);
  const [trendingVideos, setTrendingVideos] = useState<VideoItem[]>([]);
  const [followedVideos, setFollowedVideos] = useState<VideoItem[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingFollowed, setLoadingFollowed] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [followedError, setFollowedError] = useState<string | null>(null);

  // Fetch trending videos
  const fetchTrending = useCallback(async () => {
    setLoadingTrending(true);
    setTrendingError(null);
    try {
      const response = await fetch(`/api/youtube/trending?limit=${itemsPerPage}`);
      const data = await response.json();
      
      if (data.success && data.videos) {
        setTrendingVideos(data.videos);
      } else {
        setTrendingError(data.message || 'Failed to load trending videos');
        setTrendingVideos([]);
      }
    } catch (err) {
      console.error('Error fetching trending:', err);
      setTrendingError('Unable to load trending videos');
      setTrendingVideos([]);
    } finally {
      setLoadingTrending(false);
    }
  }, [itemsPerPage]);

  // Fetch followed channel videos
  const fetchFollowed = useCallback(async () => {
    if (!user) {
      setFollowedVideos([]);
      setLoadingFollowed(false);
      return;
    }
    setLoadingFollowed(true);
    setFollowedError(null);
    try {
      const response = await fetch(`/api/youtube/followed?limit=${itemsPerPage}`);
      const data = await response.json();

      if (data.success && data.videos) {
        setFollowedVideos(data.videos);
      } else {
        setFollowedError(data.error || 'Failed to load videos');
        setFollowedVideos([]);
      }
    } catch (err) {
      console.error('Error fetching followed:', err);
      setFollowedError('Unable to load followed videos');
      setFollowedVideos([]);
    } finally {
      setLoadingFollowed(false);
    }
  }, [user, itemsPerPage]);

  // Initial fetch
  useEffect(() => {
    fetchTrending();
    fetchFollowed();
  }, [fetchTrending, fetchFollowed]);

  const handleTabChange = (tab: YouTubeTab) => {
    setActiveTab(tab);
  };

  const handleVideoSaved = (video: VideoItem, saved: boolean) => {
    // Update local state to reflect save status
    const updateVideos = (videos: VideoItem[]) =>
      videos.map(v => v.videoId === video.videoId ? { ...v, bookmarked: saved } : v);
    
    setTrendingVideos(updateVideos);
    setFollowedVideos(updateVideos);
  };

  const handleManageChannels = () => {
    router.push('/feed');
  };

  const isLoading = activeTab === 'trending' ? loadingTrending : loadingFollowed;
  const videos = activeTab === 'trending' ? trendingVideos : followedVideos;
  const error = activeTab === 'trending' ? trendingError : followedError;
  const refetch = activeTab === 'trending' ? fetchTrending : fetchFollowed;

  return (
    <section className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <Youtube className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">YouTube</h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'trending' ? 'Popular videos' : 'From your followed channels'}
            </p>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-muted p-1">
            <Button
              variant={activeTab === 'trending' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('trending')}
              className={cn(
                'rounded-md gap-2',
                activeTab !== 'trending' && 'hover:bg-transparent'
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Trending
            </Button>
            <Button
              variant={activeTab === 'followed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('followed')}
              className={cn(
                'rounded-md gap-2',
                activeTab !== 'followed' && 'hover:bg-transparent'
              )}
            >
              <Users className="w-4 h-4" />
              Followed
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={refetch}
            disabled={isLoading}
            className="shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: itemsPerPage }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : error || videos.length === 0 ? (
        <EmptyState
          type={activeTab === 'trending' ? 'youtube-trending' : 'youtube-followed'}
          description={error || undefined}
          actionLabel={activeTab === 'followed' ? 'Manage Channels' : undefined}
          onAction={activeTab === 'followed' ? handleManageChannels : undefined}
          secondaryActionLabel="Retry"
          onSecondaryAction={refetch}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.videoId}
              video={video}
              onSave={handleVideoSaved}
            />
          ))}
        </div>
      )}

      {/* Footer action for followed tab */}
      {activeTab === 'followed' && videos.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={handleManageChannels}
            className="gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Manage Channels
          </Button>
        </div>
      )}
    </section>
  );
}
