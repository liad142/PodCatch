'use client';

import { useState, useEffect } from 'react';
import { PodcastCard } from '@/components/PodcastCard';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';

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

// Temporary user ID until auth is implemented
const TEMP_USER_ID = 'anonymous-user';

export default function MyPodcastsPage() {
  const [podcasts, setPodcasts] = useState<PodcastWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`/api/subscriptions?userId=${TEMP_USER_ID}`);
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
    fetchSubscriptions();
  }, []);

  const handleUnsubscribe = async (podcastId: string) => {
    try {
      const response = await fetch(
        `/api/subscriptions/${podcastId}?userId=${TEMP_USER_ID}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to unsubscribe');

      // Remove from local state
      setPodcasts(prev => prev.filter(p => p.id !== podcastId));
    } catch (err) {
      console.error('Error unsubscribing:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <LoadingState message="Loading your podcasts..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (podcasts.length === 0) {
    return (
      <div className="p-6">
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
