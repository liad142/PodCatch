"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Quote, Play, Clock, AlertCircle, Star, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAudioPlayerSafe } from "@/contexts/AudioPlayerContext";
import { cn } from "@/lib/utils";
import type { HighlightItem } from "@/types/database";

interface HighlightsCarouselProps {
  highlights: HighlightItem[];
  episodeId: string;
}

// Parse timestamp string to seconds
function parseTimestamp(timestamp: string | undefined): number | null {
  if (!timestamp) return null;

  const parts = timestamp.split(":").map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

// Truncate quote text
function truncateQuote(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function HighlightsCarousel({ highlights, episodeId }: HighlightsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const player = useAudioPlayerSafe();

  // Scroll handlers
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Handle card click - seek to timestamp
  const handleCardClick = (highlight: HighlightItem) => {
    const seconds = parseTimestamp(highlight.timestamp);
    if (seconds !== null && player) {
      player.seek(seconds);
      if (!player.isPlaying) {
        player.play();
      }
    }
  };

  // Get importance styling
  const getImportanceStyles = (importance: string) => {
    switch (importance) {
      case "critical":
        return {
          icon: AlertCircle,
          color: "text-red-500",
          borderColor: "border-l-red-500",
          bgColor: "bg-red-500/10",
        };
      case "important":
        return {
          icon: Star,
          color: "text-yellow-500",
          borderColor: "border-l-yellow-500",
          bgColor: "bg-yellow-500/10",
        };
      default:
        return {
          icon: Lightbulb,
          color: "text-blue-500",
          borderColor: "border-l-blue-500",
          bgColor: "bg-blue-500/10",
        };
    }
  };

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Key Moments</h2>
            <Badge variant="secondary">{highlights.length}</Badge>
          </div>

          {/* Scroll Buttons - Desktop */}
          <div className="hidden sm:flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {highlights.map((highlight, i) => {
            const styles = getImportanceStyles(highlight.importance);
            const Icon = styles.icon;
            const hasTimestamp = highlight.timestamp && parseTimestamp(highlight.timestamp) !== null;

            return (
              <motion.div
                key={`${highlight.timestamp || ''}-${highlight.quote.slice(0, 30)}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "shrink-0 w-[280px] sm:w-[320px] snap-start",
                  "rounded-2xl border border-border p-6",
                  "bg-card shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none hover:shadow-lg transition-all cursor-pointer",
                  "group relative overflow-hidden"
                )}
                onClick={() => handleCardClick(highlight)}
              >
                {/* Decorative faint background based on importance */}
                <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 pointer-events-none", styles.color.replace('text-', 'bg-'))} />

                {/* Importance Badge */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted border border-border text-muted-foreground")}>
                    <Icon className={cn("h-3 w-3", styles.color)} />
                    <span className="capitalize">{highlight.importance}</span>
                  </div>

                  {highlight.timestamp && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {highlight.timestamp}
                    </span>
                  )}
                </div>

                {/* Quote */}
                <div className="min-h-[80px] mb-4 relative z-10">
                  <p className="text-base leading-relaxed italic text-card-foreground/90 font-medium">
                    &ldquo;{truncateQuote(highlight.quote)}&rdquo;
                  </p>
                </div>

                {/* Play Action */}
                {hasTimestamp && (
                  <div className="relative z-10 pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 transition-colors">
                        <Play className="h-4 w-4 fill-current" />
                      </div>
                      <span>Play Highlight</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Scroll Indicators */}
        <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
          {highlights.slice(0, Math.min(5, highlights.length)).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
            />
          ))}
          {highlights.length > 5 && (
            <div className="text-xs text-muted-foreground ml-1">
              +{highlights.length - 5}
            </div>
          )}
        </div>
      </motion.div>

      {/* scrollbar-hide styles are in globals.css */}
    </div>
  );
}
