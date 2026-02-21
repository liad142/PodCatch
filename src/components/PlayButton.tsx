'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Loader2 } from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { cn } from '@/lib/utils';

interface PlayButtonProps {
  track: {
    id: string;
    title: string;
    artist: string;
    artworkUrl: string;
    audioUrl: string;
    duration?: number;
    podcastId?: string;
    source?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost' | 'overlay';
  className?: string;
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function PlayButton({
  track,
  size = 'md',
  variant = 'primary',
  className,
  showLabel = false,
}: PlayButtonProps) {
  const { currentTrack, isPlaying, isLoading, play, pause } = useAudioPlayer();
  
  const isCurrentTrack = currentTrack?.audioUrl === track.audioUrl;
  const isThisPlaying = isCurrentTrack && isPlaying;
  const isThisLoading = isCurrentTrack && isLoading;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isThisPlaying) {
      pause();
    } else if (isCurrentTrack) {
      play();
    } else {
      play(track);
    }
  };

  const variantClasses = {
    primary: cn(
      'bg-primary text-primary-foreground hover:bg-primary/90',
      'shadow-lg shadow-primary/25'
    ),
    outline: cn(
      'border-2 border-primary/50 text-primary hover:bg-primary/10',
      'bg-background/80 backdrop-blur-sm'
    ),
    ghost: cn(
      'text-foreground hover:bg-accent hover:text-accent-foreground'
    ),
    overlay: cn(
      'bg-black/60 text-white hover:bg-black/80',
      'backdrop-blur-sm'
    ),
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      disabled={isThisLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      aria-label={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
    >
      {isThisLoading ? (
        <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
      ) : isThisPlaying ? (
        <Pause className={iconSizes[size]} fill="currentColor" />
      ) : (
        <Play className={cn(iconSizes[size], 'ml-0.5')} fill="currentColor" />
      )}
    </motion.button>
  );
}

// Inline play button for use within text/cards
export function InlinePlayButton({
  track,
  className,
}: {
  track: PlayButtonProps['track'];
  className?: string;
}) {
  const { currentTrack, isPlaying, isLoading, play, pause } = useAudioPlayer();
  
  const isCurrentTrack = currentTrack?.audioUrl === track.audioUrl;
  const isThisPlaying = isCurrentTrack && isPlaying;
  const isThisLoading = isCurrentTrack && isLoading;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isThisPlaying) {
      pause();
    } else if (isCurrentTrack) {
      play();
    } else {
      play(track);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      disabled={isThisLoading}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        'bg-primary text-primary-foreground hover:bg-primary/90 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      aria-label={isThisPlaying ? 'Pause' : 'Play'}
    >
      {isThisLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isThisPlaying ? (
        <Pause className="w-3.5 h-3.5" fill="currentColor" />
      ) : (
        <Play className="w-3.5 h-3.5" fill="currentColor" />
      )}
      <span>{isThisPlaying ? 'Pause' : 'Play'}</span>
    </motion.button>
  );
}
