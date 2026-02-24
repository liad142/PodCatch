'use client';

import { useState, useEffect } from 'react';
import { PodcastCard } from '@/components/PodcastCard';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface PodcastWithStatus {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  image_url: string | null;
  rss_feed_url: string;
  language: string;
  created_at: string;
  latest_episode_date: string | null;
  subscription: {
    id: string;
    created_at: string;
    last_viewed_at: string;
  };
  has_new_episodes: boolean;
}

export default function MyPodcastsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [podcasts, setPodcasts] = useState<PodcastWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (!response.ok) throw new Error('Failed to fetch subscriptions');

      const data = await response.json();
      setPodcasts(data.podcasts || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to load your podcasts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchSubscriptions();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleUnsubscribe = async (podcastId: string) => {
    try {
      const response = await fetch(
        `/api/subscriptions/${podcastId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to unsubscribe');

      // Remove from local state
      setPodcasts(prev => prev.filter(p => p.id !== podcastId));
    } catch (err) {
      console.error('Error unsubscribing:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="p-6 min-h-screen bg-background">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 min-h-screen bg-background">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <SignInPrompt message="Sign in to see your podcasts" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen bg-background">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <LoadingState message="Loading your podcasts..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 min-h-screen bg-background">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (podcasts.length === 0) {
    return (
      <div className="p-6 min-h-screen bg-background">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <EmptyState
          type="podcasts"
          title="No subscribed podcasts"
          description="Click the heart icon on any podcast to add it to your collection."
        />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-background">
      <h1 className="text-2xl font-bold tracking-tight mb-8">My Podcasts</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {podcasts.map((podcast) => (
          <PodcastCard
            key={podcast.id}
            podcast={podcast}
            onRemove={() => handleUnsubscribe(podcast.id)}
          />
        ))}
      </div>
    </div>
  );
}
