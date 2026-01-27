// src/contexts/SummarizeQueueContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { QueueItem, QueueItemState, SummarizeQueueContextValue } from '@/types/queue';

const SummarizeQueueContext = createContext<SummarizeQueueContextValue | null>(null);

export function useSummarizeQueue() {
  const context = useContext(SummarizeQueueContext);
  if (!context) {
    throw new Error('useSummarizeQueue must be used within SummarizeQueueProvider');
  }
  return context;
}

export function useSummarizeQueueOptional() {
  return useContext(SummarizeQueueContext);
}

const MAX_RETRIES = 1;
const RETRY_DELAY = 2000;
const POLL_INTERVAL = 2500;

export function SummarizeQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ completed: 0, failed: 0, total: 0 });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  const getQueueItem = useCallback((episodeId: string) => {
    return queue.find(item => item.episodeId === episodeId);
  }, [queue]);

  const getQueuePosition = useCallback((episodeId: string) => {
    const index = queue.findIndex(item => item.episodeId === episodeId);
    if (index === -1) return -1;
    if (queue[index].state === 'queued') {
      return queue.slice(0, index + 1).filter(i =>
        i.state === 'queued' || i.state === 'transcribing' || i.state === 'summarizing'
      ).length;
    }
    return 0;
  }, [queue]);

  const updateQueueItem = useCallback((episodeId: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item =>
      item.episodeId === episodeId ? { ...item, ...updates } : item
    ));
  }, []);

  const pollStatus = useCallback(async (episodeId: string): Promise<QueueItemState> => {
    try {
      const res = await fetch(`/api/episodes/${episodeId}/summaries`);
      if (!res.ok) throw new Error('Failed to fetch status');

      const data = await res.json();
      const quickStatus = data.summaries?.quick?.status;
      const transcriptStatus = data.transcript?.status;

      if (quickStatus === 'ready') return 'ready';
      if (quickStatus === 'failed' || transcriptStatus === 'failed') return 'failed';
      if (quickStatus === 'summarizing') return 'summarizing';
      if (transcriptStatus === 'transcribing' || quickStatus === 'transcribing') return 'transcribing';
      if (quickStatus === 'queued' || transcriptStatus === 'queued') return 'transcribing';

      return 'transcribing';
    } catch {
      return 'failed';
    }
  }, []);

  const processNext = useCallback(() => {
    if (processingRef.current) return;

    setQueue(currentQueue => {
      const nextItem = currentQueue.find(item => item.state === 'queued');
      if (nextItem) {
        // Trigger processing for next item
        setTimeout(() => {
          startProcessingEpisode(nextItem.episodeId);
        }, 0);
      }
      return currentQueue;
    });
  }, []);

  const startProcessingEpisode = useCallback(async (episodeId: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessingId(episodeId);
    updateQueueItem(episodeId, { state: 'transcribing' });

    try {
      const res = await fetch(`/api/episodes/${episodeId}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'quick' })
      });

      if (!res.ok) throw new Error('Failed to start processing');

      const poll = async () => {
        const state = await pollStatus(episodeId);
        updateQueueItem(episodeId, { state });

        if (state === 'ready') {
          setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
          processingRef.current = false;
          setProcessingId(null);
          processNext();
          return;
        }

        if (state === 'failed') {
          setQueue(currentQueue => {
            const item = currentQueue.find(i => i.episodeId === episodeId);
            if (item && item.retryCount < MAX_RETRIES) {
              updateQueueItem(episodeId, { retryCount: item.retryCount + 1, state: 'transcribing' });
              setTimeout(() => startProcessingEpisode(episodeId), RETRY_DELAY);
            } else {
              setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
              processingRef.current = false;
              setProcessingId(null);
              processNext();
            }
            return currentQueue;
          });
          return;
        }

        pollingRef.current = setTimeout(poll, POLL_INTERVAL);
      };

      pollingRef.current = setTimeout(poll, POLL_INTERVAL);
    } catch {
      setQueue(currentQueue => {
        const item = currentQueue.find(i => i.episodeId === episodeId);
        if (item && item.retryCount < MAX_RETRIES) {
          updateQueueItem(episodeId, { retryCount: item.retryCount + 1 });
          setTimeout(() => startProcessingEpisode(episodeId), RETRY_DELAY);
        } else {
          updateQueueItem(episodeId, { state: 'failed', error: 'Failed to start processing' });
          setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          processingRef.current = false;
          setProcessingId(null);
          processNext();
        }
        return currentQueue;
      });
    }
  }, [pollStatus, updateQueueItem, processNext]);

  useEffect(() => {
    if (!processingId && queue.some(item => item.state === 'queued')) {
      processNext();
    }
  }, [processingId, queue, processNext]);

  const addToQueue = useCallback((episodeId: string) => {
    setQueue(prev => {
      const existing = prev.find(item => item.episodeId === episodeId);
      if (existing && existing.state !== 'failed') return prev;

      const newItem: QueueItem = {
        episodeId,
        state: 'queued',
        retryCount: 0,
        addedAt: Date.now()
      };

      const filtered = prev.filter(i => i.episodeId !== episodeId);
      return [...filtered, newItem];
    });
    setStats(prev => ({ ...prev, total: prev.total + 1 }));
  }, []);

  const removeFromQueue = useCallback((episodeId: string) => {
    setQueue(prev => prev.filter(item => item.episodeId !== episodeId));
  }, []);

  const retryEpisode = useCallback((episodeId: string) => {
    updateQueueItem(episodeId, { state: 'queued', retryCount: 0, error: undefined });
  }, [updateQueueItem]);

  const clearStats = useCallback(() => {
    setStats({ completed: 0, failed: 0, total: 0 });
    setQueue(prev => prev.filter(item =>
      item.state !== 'ready' && item.state !== 'failed'
    ));
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const value: SummarizeQueueContextValue = {
    queue,
    processingId,
    addToQueue,
    removeFromQueue,
    retryEpisode,
    getQueueItem,
    getQueuePosition,
    stats,
    clearStats
  };

  return (
    <SummarizeQueueContext.Provider value={value}>
      {children}
    </SummarizeQueueContext.Provider>
  );
}
