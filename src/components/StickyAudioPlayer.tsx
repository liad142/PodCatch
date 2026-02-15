'use client';

import React, { useMemo } from 'react';

// Sanitize artwork URLs that may contain malformed data (e.g., wrapped in ["..."])
function sanitizeImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  let cleaned = url.trim();
  // Strip JSON array/quote wrapping: ["url"] or ['url']
  if (cleaned.startsWith('[')) {
    cleaned = cleaned.replace(/^\[["']?/, '').replace(/["']?\]$/, '');
  }
  // Must start with http:// or https://
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    return null;
  }
  try {
    new URL(cleaned);
    return cleaned;
  } catch {
    return null;
  }
}
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  ChevronUp,
  ChevronDown,
  Loader2,
  X,
  Gauge,
} from 'lucide-react';
import { useAudioPlayerSafe } from '@/contexts/AudioPlayerContext';
import { AskAIBar } from '@/components/insights/AskAIBar';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// Format seconds to mm:ss or hh:mm:ss
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function StickyAudioPlayer() {
  const player = useAudioPlayerSafe();

  // Calculate volume icon (must be before conditional return)
  const VolumeIcon = useMemo(() => {
    if (!player) return Volume2;
    if (player.volume === 0) return VolumeX;
    if (player.volume < 0.5) return Volume1;
    return Volume2;
  }, [player]);

  // Don't render if no player context or no track
  if (!player || !player.currentTrack) {
    return null;
  }

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    isLoading,
    isExpanded,
    toggle,
    seekRelative,
    seek,
    setVolume,
    setPlaybackRate,
    toggleExpanded,
    clearTrack,
  } = player;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const sanitizedArtwork = sanitizeImageUrl(currentTrack.artworkUrl);

  const handleProgressChange = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    seek(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const cyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRate(PLAYBACK_RATES[nextIndex]);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'lg:left-64' // Account for desktop sidebar
        )}
      >
        {/* Glassmorphic Container */}
        <div className="relative bg-black/90 dark:bg-black/95 backdrop-blur-xl border-t border-white/10">
          {/* Integrated Ask AI Bar (shown on insights pages) */}
          <AskAIBar mode="integrated" />

          {/* Progress Bar - Top Edge */}
          <div className="absolute top-0 left-0 right-0 h-1 group cursor-pointer">
            <Slider
              value={[progressPercentage]}
              onValueChange={handleProgressChange}
              max={100}
              step={0.1}
              className="h-1 rounded-none"
              trackClassName="h-1 rounded-none bg-white/5 group-hover:h-1.5 transition-all"
              rangeClassName="bg-gradient-to-r from-primary via-primary to-violet-400"
              thumbClassName="opacity-0 group-hover:opacity-100 h-3 w-3 -mt-1 border-primary bg-white"
            />
            {/* Glow effect on progress */}
            <div 
              className="absolute top-0 h-1 bg-primary/50 blur-sm pointer-events-none transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Main Content */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-4">
              
              {/* Left Section - Track Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Album Art */}
                <motion.div 
                  className="relative shrink-0"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shadow-lg shadow-black/50 ring-1 ring-white/10">
                    {sanitizedArtwork ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={sanitizedArtwork}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 to-violet-600/30 flex items-center justify-center">
                        <Volume2 className="w-6 h-6 text-white/50" />
                      </div>
                    )}
                  </div>
                  {/* Playing indicator */}
                  {isPlaying && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/50">
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-0.5 bg-white rounded-full"
                            animate={{
                              height: ['4px', '8px', '4px'],
                            }}
                            transition={{
                              duration: 0.5,
                              repeat: Infinity,
                              delay: i * 0.1,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Track Details */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-white truncate leading-tight">
                    {currentTrack.title}
                  </h4>
                  <p className="text-xs text-white/60 truncate mt-0.5">
                    {currentTrack.artist}
                  </p>
                  {/* Time on mobile */}
                  <div className="flex items-center gap-1 mt-1 lg:hidden">
                    <span className="text-[10px] text-white/40 font-mono">
                      {formatTime(currentTime)}
                    </span>
                    <span className="text-[10px] text-white/20">/</span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Center Section - Controls */}
              <div className="flex flex-col items-center gap-1">
                {/* Main Controls */}
                <div className="flex items-center gap-1">
                  {/* Skip Back */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => seekRelative(-15)}
                    className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors relative group"
                    aria-label="Skip back 15 seconds"
                  >
                    <SkipBack className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 text-[8px] font-bold text-white/50 group-hover:text-white/80">
                      15
                    </span>
                  </motion.button>

                  {/* Play/Pause */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggle}
                    disabled={isLoading}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                      'bg-white text-black hover:scale-105 shadow-lg shadow-white/20',
                      isLoading && 'opacity-70'
                    )}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-5 h-5" fill="currentColor" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                    )}
                  </motion.button>

                  {/* Skip Forward */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => seekRelative(15)}
                    className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors relative group"
                    aria-label="Skip forward 15 seconds"
                  >
                    <SkipForward className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 text-[8px] font-bold text-white/50 group-hover:text-white/80">
                      15
                    </span>
                  </motion.button>
                </div>

                {/* Time Display - Desktop */}
                <div className="hidden lg:flex items-center gap-2 text-[11px] text-white/50 font-mono">
                  <span className="w-12 text-right">{formatTime(currentTime)}</span>
                  <span className="text-white/20">/</span>
                  <span className="w-12">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right Section - Volume & Extras */}
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                {/* Playback Speed */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={cyclePlaybackRate}
                  className={cn(
                    'hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
                    playbackRate !== 1 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  )}
                  aria-label={`Playback speed: ${playbackRate}x`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{playbackRate}x</span>
                </motion.button>

                {/* Volume Control - Desktop */}
                <div className="hidden md:flex items-center gap-2 w-32">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                    className="p-1.5 rounded-full text-white/60 hover:text-white transition-colors"
                    aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                  >
                    <VolumeIcon className="w-4 h-4" />
                  </motion.button>
                  <Slider
                    value={[volume * 100]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    className="flex-1"
                    trackClassName="h-1 bg-white/10"
                    rangeClassName="bg-white/70"
                    thumbClassName="h-3 w-3 border-white/70 bg-white opacity-0 group-hover:opacity-100 hover:opacity-100"
                  />
                </div>

                {/* Expand Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleExpanded}
                  className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={isExpanded ? 'Minimize player' : 'Expand player'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </motion.button>

                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearTrack}
                  className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close player"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Expanded View */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-white/5"
              >
                <div className="px-4 py-4">
                  {/* Full Progress Bar */}
                  <div className="mb-4">
                    <Slider
                      value={[progressPercentage]}
                      onValueChange={handleProgressChange}
                      max={100}
                      step={0.1}
                      className="mb-2"
                      trackClassName="h-2 bg-white/10"
                      rangeClassName="bg-gradient-to-r from-primary to-violet-400"
                      thumbClassName="h-4 w-4 border-2 border-primary"
                    />
                    <div className="flex justify-between text-xs text-white/50 font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Playback Speed Options */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-white/40 mr-2">Speed:</span>
                    {PLAYBACK_RATES.map((rate) => (
                      <motion.button
                        key={rate}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPlaybackRate(rate)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                          playbackRate === rate
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'text-white/50 hover:text-white hover:bg-white/10'
                        )}
                      >
                        {rate}x
                      </motion.button>
                    ))}
                  </div>

                  {/* Mobile Volume */}
                  <div className="flex md:hidden items-center gap-3 mt-4 pt-4 border-t border-white/5">
                    <VolumeIcon className="w-4 h-4 text-white/50" />
                    <Slider
                      value={[volume * 100]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      className="flex-1"
                      trackClassName="h-1.5 bg-white/10"
                      rangeClassName="bg-white/70"
                      thumbClassName="h-4 w-4 border-white/70 bg-white"
                    />
                    <span className="text-xs text-white/50 w-8 text-right font-mono">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ambient Glow Effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.15) 0%, transparent 70%)`,
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
