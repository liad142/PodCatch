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
    <div className="mt-4 pt-4 border-t border-white/5">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="w-3.5 h-3.5 text-white/40" />
        <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Chapters</span>
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
                  ? 'bg-primary/20 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded shrink-0',
                  isActive
                    ? 'bg-primary/30 text-primary-foreground'
                    : 'bg-white/5 text-white/40'
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
              className="relative h-full rounded-[1px] overflow-hidden bg-white/15"
              style={{ flex: `${seg.widthPct} 0 0%` }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-violet-400 rounded-[1px]"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Glow effect on progress */}
      <div
        className="absolute top-0 h-full bg-primary/50 blur-sm pointer-events-none"
        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
      />

      {/* Hover tooltip */}
      {hoverInfo && barRef.current && (
        <div
          className="absolute bottom-full mb-2 pointer-events-none z-10 -translate-x-1/2 whitespace-nowrap"
          style={{
            left: Math.max(60, Math.min(hoverInfo.x, barRef.current.getBoundingClientRect().width - 60)),
          }}
        >
          <div className="bg-black/90 text-white text-xs rounded px-2 py-1 shadow-lg">
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
          'fixed bottom-5 left-4 right-4 z-50 flex justify-center',
          'lg:left-[17rem]' // Account for desktop sidebar
        )}
      >
        {/* Unified Floating Card */}
        <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden bg-[#0f111a]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/50">
          {/* 1. Integrated Ask AI Bar */}
          <AskAIBar mode="integrated" />

          {/* 2. Progress Bar / Chapter Scrubber — padded hit area so taps don't bleed into AskAI */}
          {currentTrack.chapters && currentTrack.chapters.length > 0 ? (
            <div className="relative pt-5 pb-1 px-1 group cursor-pointer">
              <div className="relative h-2 group-hover:h-2.5 transition-all">
                <ChapterScrubber
                  chapters={currentTrack.chapters}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={seek}
                />
              </div>
            </div>
          ) : (
            <div className="relative pt-5 pb-1 px-1 group cursor-pointer">
              <Slider
                value={[progressPercentage]}
                onValueChange={handleProgressChange}
                max={100}
                step={0.1}
                className="h-2"
                trackClassName="h-2 rounded-sm bg-white/5 group-hover:h-2.5 transition-all"
                rangeClassName="bg-gradient-to-r from-primary via-primary to-violet-400"
                thumbClassName="opacity-0 group-hover:opacity-100 h-3.5 w-3.5 -mt-0.5 border-primary bg-white"
              />
              {/* Glow effect on progress */}
              <div
                className="absolute top-3 h-2 bg-primary/50 blur-sm pointer-events-none transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}

          {/* 3. Slim Player Controls — Spotify-style single row */}
          <div className="flex items-center gap-3 px-3 py-2">
            {/* Album Art */}
            <div className="relative shrink-0">
              <div className="relative w-10 h-10 rounded-md overflow-hidden ring-1 ring-white/10">
                {sanitizedArtwork ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={sanitizedArtwork}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-violet-600/30 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-white/50" />
                  </div>
                )}
              </div>
            </div>

            {/* Track Info — two lines */}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate leading-tight">
                {activeChapterTitle || currentTrack.title}
              </h4>
              <p className="text-[11px] text-white/45 truncate mt-0.5">
                {currentTrack.artist} &middot; {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>

            {/* Compact Controls */}
            <div className="flex items-center gap-0.5 shrink-0">
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
                className="p-1.5 rounded-full text-white/60 hover:text-white transition-colors"
                aria-label={currentTrack.chapters ? 'Previous chapter' : 'Skip back 15 seconds'}
              >
                <SkipBack className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggle}
                disabled={isLoading}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  'bg-white text-black shadow-lg shadow-white/20',
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
                className="p-1.5 rounded-full text-white/60 hover:text-white transition-colors"
                aria-label={currentTrack.chapters ? 'Next chapter' : 'Skip forward 15 seconds'}
              >
                <SkipForward className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleExpanded}
                className="p-1.5 rounded-full text-white/50 hover:text-white transition-colors"
                aria-label={isExpanded ? 'Minimize player' : 'Expand player'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={clearTrack}
                className="p-1.5 rounded-full text-white/30 hover:text-white transition-colors"
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
