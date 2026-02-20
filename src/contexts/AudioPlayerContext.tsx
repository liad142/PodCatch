'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface Track {
  id: string;
  title: string;
  artist: string; // Podcast name
  artworkUrl: string;
  audioUrl: string;
  duration?: number;
  chapters?: { title: string; timestamp: string; timestamp_seconds: number }[];
}

export type { Track };

// Frequently changing state (updates ~60fps during playback)
interface AudioPlayerFrequentState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
}

// Stable state + control functions (changes infrequently)
interface AudioPlayerControlsType {
  currentTrack: Track | null;
  volume: number;
  playbackRate: number;
  isExpanded: boolean;
  play: (track?: Track) => void;
  playFromTime: (track: Track, time: number) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  loadTrack: (track: Track) => void;
  updateTrackMeta: (meta: Partial<Track>) => void;
  clearTrack: () => void;
  toggleExpanded: () => void;
}

// Combined type for backward compatibility
interface AudioPlayerContextType extends AudioPlayerFrequentState, AudioPlayerControlsType {}

// Two separate contexts
const AudioPlayerStateContext = createContext<AudioPlayerFrequentState | null>(null);
const AudioPlayerControlsContext = createContext<AudioPlayerControlsType | null>(null);

// Hook for frequently changing state (currentTime, isPlaying, etc.)
export function useAudioPlayerState() {
  const context = useContext(AudioPlayerStateContext);
  if (!context) {
    throw new Error('useAudioPlayerState must be used within an AudioPlayerProvider');
  }
  return context;
}

// Hook for stable controls and infrequently changing state
export function useAudioPlayerControls() {
  const context = useContext(AudioPlayerControlsContext);
  if (!context) {
    throw new Error('useAudioPlayerControls must be used within an AudioPlayerProvider');
  }
  return context;
}

// Combined hook for backward compatibility
export function useAudioPlayer(): AudioPlayerContextType {
  const state = useAudioPlayerState();
  const controls = useAudioPlayerControls();
  return { ...state, ...controls };
}

// Safe hook that doesn't throw if used outside provider
export function useAudioPlayerSafe(): AudioPlayerContextType | null {
  const state = useContext(AudioPlayerStateContext);
  const controls = useContext(AudioPlayerControlsContext);
  if (!state || !controls) return null;
  return { ...state, ...controls };
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInitialized = useRef(false);

  // Frequently changing state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Infrequently changing state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // Use refs for values needed in callbacks to avoid stale closures
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Lazy initialize audio element only when needed
  const initializeAudio = useCallback(() => {
    if (typeof window === 'undefined' || audioRef.current || audioInitialized.current) {
      return audioRef.current;
    }

    audioInitialized.current = true;
    audioRef.current = new Audio();
    audioRef.current.volume = 0.8;
    audioRef.current.playbackRate = 1;

    // Event listeners
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

    return audio;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const loadTrack = useCallback((track: Track) => {
    const audio = initializeAudio();
    if (!audio) return;

    setCurrentTrack(track);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(track.duration || 0);

    audio.src = track.audioUrl;
    audio.load();
  }, [initializeAudio]);

  const play = useCallback((track?: Track) => {
    const audio = initializeAudio();
    if (!audio) return;

    if (track) {
      loadTrack(track);
      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.play().catch(() => {});
      };
      audio.addEventListener('canplay', onCanPlay);
    } else {
      audio.play().catch(() => {});
    }
  }, [loadTrack, initializeAudio]);

  const playFromTime = useCallback((track: Track, time: number) => {
    const audio = initializeAudio();
    if (!audio) return;

    loadTrack(track);
    const onCanPlay = () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.currentTime = Math.max(0, time);
      audio.play().catch(() => {});
    };
    audio.addEventListener('canplay', onCanPlay);
  }, [loadTrack, initializeAudio]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) {
      audioRef.current?.pause();
    } else {
      const audio = initializeAudio();
      audio?.play().catch(() => {});
    }
  }, [initializeAudio]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, durationRef.current));
  }, []);

  const seekRelative = useCallback((delta: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + delta, durationRef.current));
    audioRef.current.currentTime = newTime;
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clampedVolume = Math.max(0, Math.min(1, vol));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const updateTrackMeta = useCallback((meta: Partial<Track>) => {
    setCurrentTrack(prev => prev ? { ...prev, ...meta } : prev);
  }, []);

  const clearTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Memoize the frequently changing state value
  const stateValue = useMemo<AudioPlayerFrequentState>(() => ({
    currentTime,
    duration,
    isPlaying,
    isLoading,
  }), [currentTime, duration, isPlaying, isLoading]);

  // Memoize the controls value - only changes when stable state changes
  const controlsValue = useMemo<AudioPlayerControlsType>(() => ({
    currentTrack,
    volume,
    playbackRate,
    isExpanded,
    play,
    playFromTime,
    pause,
    toggle,
    seek,
    seekRelative,
    setVolume,
    setPlaybackRate,
    loadTrack,
    updateTrackMeta,
    clearTrack,
    toggleExpanded,
  }), [
    currentTrack,
    volume,
    playbackRate,
    isExpanded,
    play,
    playFromTime,
    pause,
    toggle,
    seek,
    seekRelative,
    setVolume,
    setPlaybackRate,
    loadTrack,
    updateTrackMeta,
    clearTrack,
    toggleExpanded,
  ]);

  return (
    <AudioPlayerControlsContext.Provider value={controlsValue}>
      <AudioPlayerStateContext.Provider value={stateValue}>
        {children}
      </AudioPlayerStateContext.Provider>
    </AudioPlayerControlsContext.Provider>
  );
}
