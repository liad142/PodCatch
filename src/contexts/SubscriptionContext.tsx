'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionContextType {
  subscribedPodcastIds: Set<string>;  // Internal podcast UUIDs
  subscribedAppleIds: Set<string>;    // Apple podcast IDs (strings)
  isLoading: boolean;
  isSubscribed: (appleId: string) => boolean;
  subscribe: (appleId: string) => Promise<void>;
  unsubscribe: (appleId: string) => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscribedPodcastIds, setSubscribedPodcastIds] = useState<Set<string>>(new Set());
  const [subscribedAppleIds, setSubscribedAppleIds] = useState<Set<string>>(new Set());
  const [appleToInternalMap, setAppleToInternalMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscriptions = useCallback(async () => {
    if (!user) {
      setSubscribedPodcastIds(new Set());
      setSubscribedAppleIds(new Set());
      setAppleToInternalMap(new Map());
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/subscriptions');
      if (!response.ok) return;

      const data = await response.json();
      const podcasts = data.podcasts || [];

      const podcastIds = new Set<string>();
      const appleIds = new Set<string>();
      const mapping = new Map<string, string>();

      podcasts.forEach((podcast: any) => {
        podcastIds.add(podcast.id);
        if (podcast.rss_feed_url?.startsWith('apple:')) {
          const appleId = podcast.rss_feed_url.replace('apple:', '');
          appleIds.add(appleId);
          mapping.set(appleId, podcast.id);
        }
      });

      setSubscribedPodcastIds(podcastIds);
      setSubscribedAppleIds(appleIds);
      setAppleToInternalMap(mapping);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Re-fetch when user changes (login/logout)
  useEffect(() => {
    refreshSubscriptions();
  }, [refreshSubscriptions]);

  const isSubscribed = useCallback((appleId: string) => {
    return subscribedAppleIds.has(appleId);
  }, [subscribedAppleIds]);

  const subscribe = useCallback(async (appleId: string) => {
    if (!user) return;

    // Optimistically update UI
    setSubscribedAppleIds(prev => new Set(prev).add(appleId));

    try {
      const appleRssUrl = `apple:${appleId}`;

      // First ensure podcast exists in DB
      const addResponse = await fetch('/api/podcasts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rss_url: appleRssUrl }),
      });

      if (!addResponse.ok) throw new Error('Failed to add podcast');
      const { id: podcastId } = await addResponse.json();

      // Create subscription
      await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podcastId }),
      });

      // Update internal state
      setSubscribedPodcastIds(prev => new Set(prev).add(podcastId));
      setAppleToInternalMap(prev => new Map(prev).set(appleId, podcastId));
    } catch (error) {
      // Revert on error
      setSubscribedAppleIds(prev => {
        const next = new Set(prev);
        next.delete(appleId);
        return next;
      });
      console.error('Error subscribing:', error);
    }
  }, [user]);

  const unsubscribe = useCallback(async (appleId: string) => {
    if (!user) return;

    const podcastId = appleToInternalMap.get(appleId);
    if (!podcastId) {
      try {
        const lookupResponse = await fetch(`/api/podcasts/lookup?rss_url=${encodeURIComponent(`apple:${appleId}`)}`);
        if (!lookupResponse.ok) return;
        const { podcastId: foundId } = await lookupResponse.json();
        if (foundId) {
          await performUnsubscribe(appleId, foundId);
        }
      } catch (error) {
        console.error('Error looking up podcast:', error);
      }
      return;
    }

    await performUnsubscribe(appleId, podcastId);
  }, [appleToInternalMap, user]);

  const performUnsubscribe = async (appleId: string, podcastId: string) => {
    // Optimistically update UI
    setSubscribedAppleIds(prev => {
      const next = new Set(prev);
      next.delete(appleId);
      return next;
    });

    try {
      await fetch(`/api/subscriptions/${podcastId}`, {
        method: 'DELETE',
      });

      setSubscribedPodcastIds(prev => {
        const next = new Set(prev);
        next.delete(podcastId);
        return next;
      });
    } catch (error) {
      // Revert on error
      setSubscribedAppleIds(prev => new Set(prev).add(appleId));
      console.error('Error unsubscribing:', error);
    }
  };

  return (
    <SubscriptionContext.Provider value={{
      subscribedPodcastIds,
      subscribedAppleIds,
      isLoading,
      isSubscribed,
      subscribe,
      unsubscribe,
      refreshSubscriptions,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
