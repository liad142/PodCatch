'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bookmark, RefreshCw, Youtube, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoCard, VideoItem } from '@/components/VideoCard';
import { EmptyState } from '@/components/EmptyState';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type SavedTab = 'youtube' | 'podcasts';

interface SavedVideo {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  url: string;
  bookmarked: boolean;
  savedAt: string;
}

export default function SavedPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<SavedTab>('youtube');
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedVideos = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/youtube/save?limit=50');
      const data = await response.json();

      if (data.success && data.videos) {
        setSavedVideos(data.videos);
      } else {
        setError(data.error || 'Failed to load saved videos');
        setSavedVideos([]);
      }
    } catch (err) {
      console.error('Error fetching saved videos:', err);
      setError('Unable to load saved videos');
      setSavedVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'youtube' && user) {
      fetchSavedVideos();
    } else if (!user) {
      setIsLoading(false);
    }
  }, [activeTab, fetchSavedVideos, user]);

  const handleVideoUnsaved = (video: VideoItem, saved: boolean) => {
    if (!saved) {
      setSavedVideos(prev => prev.filter(v => v.videoId !== video.videoId));
    }
  };

  const transformToVideoItem = (saved: SavedVideo): VideoItem => ({
    videoId: saved.videoId,
    title: saved.title,
    description: saved.description,
    thumbnailUrl: saved.thumbnailUrl || `https://img.youtube.com/vi/${saved.videoId}/hqdefault.jpg`,
    publishedAt: saved.publishedAt,
    url: saved.url,
    bookmarked: true,
  });

  if (authLoading) {
    return (
      <div className="px-4 py-8 min-h-screen bg-background">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-48 mb-4 bg-secondary" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-xl bg-secondary" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-8 min-h-screen bg-background">
        <div className="max-w-5xl mx-auto mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-card shadow-sm border border-border">
              <Bookmark className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Saved</h1>
              <p className="text-muted-foreground mt-1">Your bookmarked videos and episodes</p>
            </div>
          </div>
        </div>
        <SignInPrompt message="Sign up to see your saved content" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 min-h-screen bg-background">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-card shadow-sm border border-border">
            <Bookmark className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Saved</h1>
            <p className="text-muted-foreground mt-1">
              Your bookmarked videos and episodes
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-lg bg-card p-1 border border-border">
            <Button
              variant={activeTab === 'youtube' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('youtube')}
              className={cn(
                'rounded-md gap-2',
                activeTab !== 'youtube' && 'hover:bg-secondary'
              )}
            >
              <Youtube className="w-4 h-4" />
              YouTube
            </Button>
            <Button
              variant={activeTab === 'podcasts' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('podcasts')}
              className={cn(
                'rounded-md gap-2',
                activeTab !== 'podcasts' && 'hover:bg-secondary'
              )}
            >
              <Radio className="w-4 h-4" />
              Podcasts
            </Button>
          </div>

          {activeTab === 'youtube' && (
            <Button
              variant="outline"
              size="icon"
              onClick={fetchSavedVideos}
              disabled={isLoading}
              className="bg-card border-border"
              aria-label="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto">
        {activeTab === 'youtube' ? (
          isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-video rounded-xl bg-secondary" />
                  <Skeleton className="h-4 w-3/4 bg-secondary" />
                  <Skeleton className="h-3 w-1/2 bg-secondary" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              type="saved"
              title="Error Loading Saved"
              description={error}
              secondaryActionLabel="Retry"
              onSecondaryAction={fetchSavedVideos}
            />
          ) : savedVideos.length === 0 ? (
            <EmptyState
              type="saved"
              title="No Saved Videos"
              description="Save videos from the Discover page to access them here anytime."
              actionLabel="Discover Videos"
              onAction={() => window.location.href = '/browse'}
            />
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                {savedVideos.length} saved video{savedVideos.length !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {savedVideos.map((video) => (
                  <VideoCard
                    key={video.videoId}
                    video={transformToVideoItem(video)}
                    onSave={handleVideoUnsaved}
                  />
                ))}
              </div>
            </>
          )
        ) : (
          <EmptyState
            type="saved"
            title="Podcast Saves Coming Soon"
            description="The ability to save podcast episodes is coming in a future update. For now, you can save YouTube videos!"
            actionLabel="Discover Podcasts"
            onAction={() => window.location.href = '/browse'}
          />
        )}
      </div>
    </div>
  );
}
