'use client';

import React, { useMemo, useRef, useState, useCallback } from 'react';

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
  Clock,
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

// Compact chapter list for the expanded player view
function PlayerChapters({
  chapters,
  currentTime,
  onSeek,
}: {
  chapters: { title: string; timestamp: string; timestamp_seconds: number }[];
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  // Find active chapter index
  const activeIndex = useMemo(() => {
    let active = -1;
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].timestamp_seconds <= currentTime) active = i;
    }
    return active;
  }, [chapters, currentTime]);

  return (
    <div className="mt-4 pt-4 border-t border-border/30">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Chapters</span>
      </div>
      <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 space-y-0.5">
        {chapters.map((ch, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={i}
              onClick={() => onSeek(ch.timestamp_seconds)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors',
                isActive
                  ? 'bg-primary/20 text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded shrink-0',
                  isActive
                    ? 'bg-primary/30 text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {ch.timestamp}
              </span>
              <span className="text-xs truncate">{ch.title}</span>
              {isActive && (
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider shrink-0 ml-auto">
                  Now
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// YouTube-style segmented chapter scrubber for the top progress bar
function ChapterScrubber({
  chapters,
  currentTime,
  duration,
  onSeek,
}: {
  chapters: { title: string; timestamp: string; timestamp_seconds: number }[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    time: number;
    chapterTitle: string;
  } | null>(null);

  const segments = useMemo(() => {
    const raw = chapters.map((ch, i) => {
      const start = ch.timestamp_seconds;
      const end = i < chapters.length - 1 ? chapters[i + 1].timestamp_seconds : duration;
      return { ...ch, start, end, widthPct: duration > 0 ? ((end - start) / duration) * 100 : 0 };
    });
    // Add intro spacer when first chapter doesn't start at 0 — keeps visual aligned with seek math
    if (raw.length > 0 && raw[0].start > 0 && duration > 0) {
      raw.unshift({
        title: 'Intro',
        timestamp: '00:00',
        timestamp_seconds: 0,
        start: 0,
        end: raw[0].start,
        widthPct: (raw[0].start / duration) * 100,
      });
    }
    return raw;
  }, [chapters, duration]);

  const getTimeFromX = useCallback(
    (clientX: number) => {
      if (!barRef.current) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pct * duration;
    },
    [duration]
  );

  const getHoverInfo = useCallback(
    (clientX: number) => {
      if (!barRef.current) return null;
      const rect = barRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const time = getTimeFromX(clientX);
      const chapter = segments.findLast((s) => time >= s.start) ?? segments[0];
      return { x, time, chapterTitle: chapter?.title ?? '' };
    },
    [getTimeFromX, segments]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      const time = getTimeFromX(e.clientX);
      onSeek(time);
      setHoverInfo(getHoverInfo(e.clientX));
    },
    [getTimeFromX, getHoverInfo, onSeek]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const info = getHoverInfo(e.clientX);
      setHoverInfo(info);
      if (isDragging && info) {
        onSeek(info.time);
      }
    },
    [isDragging, getHoverInfo, onSeek]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (!isDragging) setHoverInfo(null);
  }, [isDragging]);

  // Total gap pixels: 2px per gap
  const gapCount = segments.length - 1;

  return (
    <div
      ref={barRef}
      className="relative w-full h-full"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{ touchAction: 'none' }}
    >
      {/* Segments */}
      <div className="flex h-full items-stretch" style={{ gap: gapCount > 0 ? '3px' : 0 }}>
        {segments.map((seg, i) => {
          let fillPct = 0;
          if (currentTime >= seg.end) fillPct = 100;
          else if (currentTime > seg.start) fillPct = ((currentTime - seg.start) / (seg.end - seg.start)) * 100;

          return (
            <div
              key={i}
              className="relative h-full rounded-[1px] overflow-hidden bg-secondary"
              style={{ flex: `${seg.widthPct} 0 0%` }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-[1px]"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Hover tooltip */}
      {hoverInfo && barRef.current && (
        <div
          className="absolute bottom-full mb-2 pointer-events-none z-10 -translate-x-1/2 whitespace-nowrap"
          style={{
            left: Math.max(60, Math.min(hoverInfo.x, barRef.current.getBoundingClientRect().width - 60)),
          }}
        >
          <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-lg border border-border">
            {hoverInfo.chapterTitle} &middot; {formatTime(hoverInfo.time)}
          </div>
        </div>
      )}
    </div>
  );
}

export function StickyAudioPlayer() {
  const player = useAudioPlayerSafe();

  // All hooks must be before conditional return
  const VolumeIcon = useMemo(() => {
    if (!player) return Volume2;
    if (player.volume === 0) return VolumeX;
    if (player.volume < 0.5) return Volume1;
    return Volume2;
  }, [player]);

  const activeChapterIndex = useMemo(() => {
    const chapters = player?.currentTrack?.chapters;
    if (!chapters || chapters.length === 0) return -1;
    const time = player?.currentTime ?? 0;
    let idx = -1;
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].timestamp_seconds <= time) idx = i;
    }
    return idx;
  }, [player?.currentTrack?.chapters, player?.currentTime]);

  const activeChapterTitle = player?.currentTrack?.chapters && activeChapterIndex >= 0
    ? player.currentTrack.chapters[activeChapterIndex].title
    : null;

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
          'fixed bottom-16 left-0 right-0 z-40',
          'lg:bottom-0 lg:left-64' // Account for desktop sidebar; mobile sits above bottom nav
        )}
      >
        {/* Player card with glass effect — the ONE place we keep backdrop-blur */}
        <div className="relative w-full overflow-hidden backdrop-blur-xl bg-background/80 border-t border-border">
          {/* Progress bar — full-width thin bar at the very top */}
          <div className="absolute top-0 left-0 right-0 h-1 z-10">
            {currentTrack.chapters && currentTrack.chapters.length > 0 ? (
              <ChapterScrubber
                chapters={currentTrack.chapters}
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
              />
            ) : (
              <div className="relative w-full h-full bg-secondary">
                <div
                  className="absolute inset-y-0 left-0 bg-primary"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            )}
          </div>

          {/* Integrated Ask AI Bar */}
          <AskAIBar mode="integrated" />

          {/* Collapsed player controls (h-16) */}
          <div className="flex items-center gap-3 h-16 px-3 pt-1">
            {/* Left: Track artwork + info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Artwork */}
              <div className="relative shrink-0 w-11 h-11 rounded-lg overflow-hidden shadow-[var(--shadow-1)]">
                {sanitizedArtwork ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={sanitizedArtwork}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Track info */}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-foreground truncate leading-tight">
                  {activeChapterTitle || currentTrack.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Center: Transport controls */}
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Skip back */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const chapters = currentTrack.chapters;
                  if (chapters && chapters.length > 0 && activeChapterIndex > 0) {
                    seek(chapters[activeChapterIndex - 1].timestamp_seconds);
                  } else {
                    seekRelative(-15);
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={currentTrack.chapters ? 'Previous chapter' : 'Skip back 15 seconds'}
              >
                <SkipBack className="w-4 h-4" />
              </motion.button>

              {/* Play/Pause */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggle}
                disabled={isLoading}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  'bg-accent-green text-white',
                  isLoading && 'opacity-70'
                )}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" fill="currentColor" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                )}
              </motion.button>

              {/* Skip forward */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const chapters = currentTrack.chapters;
                  if (chapters && chapters.length > 0 && activeChapterIndex < chapters.length - 1) {
                    seek(chapters[activeChapterIndex + 1].timestamp_seconds);
                  } else {
                    seekRelative(15);
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={currentTrack.chapters ? 'Next chapter' : 'Skip forward 15 seconds'}
              >
                <SkipForward className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Right: Time, volume, expand, close */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Time display */}
              <span className="hidden sm:inline-block font-mono text-xs text-muted-foreground tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Desktop volume */}
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  <VolumeIcon className="w-4 h-4" />
                </button>
                <Slider
                  value={[volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  className="w-20"
                  trackClassName="h-1 bg-secondary"
                  rangeClassName="bg-foreground/60"
                  thumbClassName="h-3 w-3 border-foreground/60 bg-foreground"
                />
              </div>

              {/* Expand chevron */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleExpanded}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                aria-label={isExpanded ? 'Minimize player' : 'Expand player'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </motion.button>

              {/* Close */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={clearTrack}
                className="p-1.5 rounded-full text-muted-foreground/50 hover:text-foreground transition-colors"
                aria-label="Close player"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
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
                className="overflow-hidden border-t border-border"
              >
                <div className="px-4 py-4">
                  {/* Larger artwork in expanded */}
                  <div className="flex justify-center mb-4">
                    <div className="w-[120px] h-[120px] rounded-2xl overflow-hidden shadow-[var(--shadow-floating)]">
                      {sanitizedArtwork ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={sanitizedArtwork}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Volume2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seek slider */}
                  <div className="mb-4">
                    <Slider
                      value={[progressPercentage]}
                      onValueChange={handleProgressChange}
                      max={100}
                      step={0.1}
                      className="mb-2"
                      trackClassName="h-1.5 rounded-full bg-secondary"
                      rangeClassName="bg-primary"
                      thumbClassName="h-4 w-4 border-2 border-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Active chapter name */}
                  {activeChapterTitle && (
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      {activeChapterTitle}
                    </p>
                  )}

                  {/* Speed selector pills */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground mr-2">Speed:</span>
                    {PLAYBACK_RATES.map((rate) => (
                      <motion.button
                        key={rate}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPlaybackRate(rate)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                          playbackRate === rate
                            ? 'bg-secondary text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                        )}
                      >
                        {rate}x
                      </motion.button>
                    ))}
                  </div>

                  {/* Mobile Volume */}
                  <div className="flex md:hidden items-center gap-3 mt-4 pt-4 border-t border-border/30">
                    <VolumeIcon className="w-4 h-4 text-muted-foreground" />
                    <Slider
                      value={[volume * 100]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      className="flex-1"
                      trackClassName="h-1.5 bg-secondary"
                      rangeClassName="bg-foreground/60"
                      thumbClassName="h-4 w-4 border-foreground/60 bg-foreground"
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right font-mono">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>

                  {/* Chapters */}
                  {currentTrack.chapters && currentTrack.chapters.length > 0 && (
                    <PlayerChapters
                      chapters={currentTrack.chapters}
                      currentTime={currentTime}
                      onSeek={seek}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
