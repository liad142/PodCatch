'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface Track {
  id: string;
  title: string;
  artist: string; // Podcast name
  artworkUrl: string;
  audioUrl: string;
  duration?: number;
}

interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLoading: boolean;
  isExpanded: boolean;
}

interface AudioPlayerContextType extends AudioPlayerState {
  play: (track?: Track) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  loadTrack: (track: Track) => void;
  clearTrack: () => void;
  toggleExpanded: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}

// Safe hook that doesn't throw if used outside provider
export function useAudioPlayerSafe() {
  return useContext(AudioPlayerContext);
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInitialized = useRef(false);

  const [state, setState] = useState<AudioPlayerState>({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    playbackRate: 1,
    isLoading: false,
    isExpanded: false,
  });

  // Lazy initialize audio element only when needed
  const initializeAudio = useCallback(() => {
    if (typeof window === 'undefined' || audioRef.current || audioInitialized.current) {
      return audioRef.current;
    }

    audioInitialized.current = true;
    audioRef.current = new Audio();
    audioRef.current.volume = state.volume;
    audioRef.current.playbackRate = state.playbackRate;

    // Event listeners
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration,
        isLoading: false
      }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleWaiting = () => {
      setState(prev => ({ ...prev, isLoading: true }));
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

    return audio;
  }, [state.volume, state.playbackRate]);

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

    setState(prev => ({
      ...prev,
      currentTrack: track,
      isLoading: true,
      currentTime: 0,
      duration: track.duration || 0,
    }));

    audio.src = track.audioUrl;
    audio.load();
  }, [initializeAudio]);

  const play = useCallback((track?: Track) => {
    const audio = initializeAudio();
    if (!audio) return;

    if (track) {
      loadTrack(track);
      // Small delay to ensure source is loaded
      setTimeout(() => {
        audio.play().catch(console.error);
      }, 100);
    } else {
      audio.play().catch(console.error);
    }
  }, [loadTrack, initializeAudio]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
  }, [state.duration]);

  const seekRelative = useCallback((delta: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + delta, state.duration));
    audioRef.current.currentTime = newTime;
  }, [state.duration]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ ...prev, volume: clampedVolume }));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setState(prev => ({ ...prev, playbackRate: rate }));
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const clearTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setState(prev => ({
      ...prev,
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }));
  }, []);

  const toggleExpanded = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  const value: AudioPlayerContextType = {
    ...state,
    play,
    pause,
    toggle,
    seek,
    seekRelative,
    setVolume,
    setPlaybackRate,
    loadTrack,
    clearTrack,
    toggleExpanded,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}
