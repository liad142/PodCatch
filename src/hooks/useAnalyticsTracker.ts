'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAudioPlayerSafe } from '@/contexts/AudioPlayerContext';
import { getAnonymousId } from '@/lib/anonymous-id';

const CHECK_INTERVAL_MS = 5000; // Check milestones every 5 seconds

interface SessionState {
  sessionId: string;
  episodeId: string;
  podcastId: string;
  source: string | undefined;
  episodeDuration: number;
  durationListened: number;
  maxPosition: number;
  reached60s: boolean;
  reached25pct: boolean;
  reached50pct: boolean;
  reached75pct: boolean;
  completed: boolean;
  started: boolean;
}

function sendAnalytics(payload: Record<string, unknown>, beacon = false) {
  const anonymousId = getAnonymousId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-anonymous-id': anonymousId,
  };

  if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    // sendBeacon doesn't support custom headers, so embed anonymous_id in body
    const beaconPayload = { ...payload, anonymous_id: anonymousId };
    navigator.sendBeacon('/api/analytics/play', new Blob([JSON.stringify(beaconPayload)], { type: 'application/json' }));
    return;
  }

  fetch('/api/analytics/play', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {}); // Fire-and-forget
}

export function useAnalyticsTracker() {
  const player = useAudioPlayerSafe();
  const sessionRef = useRef<SessionState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTrackUrlRef = useRef<string | null>(null);

  const endSession = useCallback((beacon = false) => {
    const session = sessionRef.current;
    if (!session || !session.started) return;

    sendAnalytics({
      action: 'end',
      session_id: session.sessionId,
      episode_id: session.episodeId,
      podcast_id: session.podcastId,
      duration_listened: session.durationListened,
      max_position: session.maxPosition,
      completed: session.completed,
      reached_60s: session.reached60s,
      reached_25pct: session.reached25pct,
      reached_50pct: session.reached50pct,
      reached_75pct: session.reached75pct,
    }, beacon);

    sessionRef.current = null;
  }, []);

  const startSession = useCallback((episodeId: string, podcastId: string, source: string | undefined, duration: number) => {
    const sessionId = crypto.randomUUID();
    const session: SessionState = {
      sessionId,
      episodeId,
      podcastId,
      source,
      episodeDuration: duration,
      durationListened: 0,
      maxPosition: 0,
      reached60s: false,
      reached25pct: false,
      reached50pct: false,
      reached75pct: false,
      completed: false,
      started: true,
    };
    sessionRef.current = session;

    sendAnalytics({
      action: 'start',
      session_id: sessionId,
      episode_id: episodeId,
      podcast_id: podcastId,
      source,
      episode_duration: duration || undefined,
    });
  }, []);

  const checkMilestones = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !player) return;

    const { currentTime, duration, isPlaying, playbackRate } = {
      ...player,
    };

    if (!isPlaying) return;

    session.durationListened = Math.round(currentTime);
    session.maxPosition = Math.max(session.maxPosition, Math.round(currentTime));

    // Update episode duration if we got a better value
    if (duration > 0) {
      session.episodeDuration = duration;
    }

    let updated = false;
    const epDuration = session.episodeDuration;

    if (!session.reached60s && currentTime >= 60) {
      session.reached60s = true;
      updated = true;
    }
    if (epDuration > 0) {
      if (!session.reached25pct && currentTime >= epDuration * 0.25) {
        session.reached25pct = true;
        updated = true;
      }
      if (!session.reached50pct && currentTime >= epDuration * 0.5) {
        session.reached50pct = true;
        updated = true;
      }
      if (!session.reached75pct && currentTime >= epDuration * 0.75) {
        session.reached75pct = true;
        updated = true;
      }
      if (!session.completed && currentTime >= epDuration * 0.9) {
        session.completed = true;
        updated = true;
      }
    }

    if (updated) {
      sendAnalytics({
        action: 'update',
        session_id: session.sessionId,
        episode_id: session.episodeId,
        podcast_id: session.podcastId,
        duration_listened: session.durationListened,
        max_position: session.maxPosition,
        completed: session.completed,
        reached_60s: session.reached60s,
        reached_25pct: session.reached25pct,
        reached_50pct: session.reached50pct,
        reached_75pct: session.reached75pct,
        playback_rate: playbackRate,
      });
    }
  }, [player]);

  // Watch for track changes
  useEffect(() => {
    if (!player) return;

    const { currentTrack, isPlaying } = player;
    const trackUrl = currentTrack?.audioUrl || null;

    // Track changed — end old session, maybe start new
    if (trackUrl !== lastTrackUrlRef.current) {
      if (sessionRef.current) {
        endSession();
      }

      if (currentTrack && isPlaying && currentTrack.podcastId) {
        startSession(
          currentTrack.id,
          currentTrack.podcastId,
          currentTrack.source,
          currentTrack.duration || 0
        );
      }

      lastTrackUrlRef.current = trackUrl;
    } else if (currentTrack && isPlaying && !sessionRef.current && currentTrack.podcastId) {
      // Resumed playback without track change
      startSession(
        currentTrack.id,
        currentTrack.podcastId,
        currentTrack.source,
        currentTrack.duration || 0
      );
    }
  }, [player?.currentTrack?.audioUrl, player?.isPlaying, endSession, startSession]);

  // Milestone check interval
  useEffect(() => {
    intervalRef.current = setInterval(checkMilestones, CHECK_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkMilestones]);

  // End session on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      endSession(true);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [endSession]);
}
