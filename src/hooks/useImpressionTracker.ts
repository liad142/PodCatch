'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getAnonymousId } from '@/lib/anonymous-id';
import type { ImpressionSurface } from '@/types/analytics';

interface ImpressionItem {
  podcast_id?: string;
  episode_id?: string;
  surface: ImpressionSurface;
  position: number;
}

const BATCH_INTERVAL_MS = 10000; // Batch every 10 seconds
const MIN_VISIBLE_TIME_MS = 1000; // Must be visible for 1 second

let pendingImpressions: ImpressionItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushImpressions() {
  if (pendingImpressions.length === 0) return;

  const batch = [...pendingImpressions];
  pendingImpressions = [];

  const anonymousId = getAnonymousId();

  fetch('/api/analytics/impression', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-anonymous-id': anonymousId,
    },
    body: JSON.stringify({ impressions: batch }),
    keepalive: true,
  }).catch(() => {}); // Fire-and-forget
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushImpressions();
  }, BATCH_INTERVAL_MS);
}

function queueImpression(item: ImpressionItem) {
  pendingImpressions.push(item);
  scheduleFlush();
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushImpressions);
}

/**
 * Track impressions for a list of items using IntersectionObserver.
 * Each item fires at most once per mount.
 */
export function useImpressionTracker(
  surface: ImpressionSurface,
  items: { id: string; podcastId?: string; episodeId?: string }[],
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const trackedRef = useRef<Set<string>>(new Set());
  const timerMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const elementsRef = useRef<Map<string, Element>>(new Map());

  const registerElement = useCallback((id: string, el: Element | null) => {
    if (!el) {
      elementsRef.current.delete(id);
      return;
    }
    elementsRef.current.set(id, el);
    observerRef.current?.observe(el);
  }, []);

  useEffect(() => {
    const itemMap = new Map(items.map((item, i) => [item.id, { ...item, position: i }]));

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.impressionId;
          if (!id) continue;

          if (entry.isIntersecting && !trackedRef.current.has(id)) {
            // Start timer for visibility threshold
            const timer = setTimeout(() => {
              if (trackedRef.current.has(id)) return;
              trackedRef.current.add(id);

              const item = itemMap.get(id);
              if (item) {
                queueImpression({
                  podcast_id: item.podcastId,
                  episode_id: item.episodeId,
                  surface,
                  position: item.position,
                });
              }
              timerMapRef.current.delete(id);
            }, MIN_VISIBLE_TIME_MS);

            timerMapRef.current.set(id, timer);
          } else if (!entry.isIntersecting) {
            // Cancel timer if scrolled away
            const timer = timerMapRef.current.get(id!);
            if (timer) {
              clearTimeout(timer);
              timerMapRef.current.delete(id!);
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    // Observe any already-registered elements
    for (const el of elementsRef.current.values()) {
      observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
      for (const timer of timerMapRef.current.values()) {
        clearTimeout(timer);
      }
      timerMapRef.current.clear();
    };
  }, [surface, items]);

  return { registerElement };
}
