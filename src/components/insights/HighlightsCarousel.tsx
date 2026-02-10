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
                  "rounded-xl border border-l-4 p-4",
                  "bg-card hover:shadow-lg transition-all cursor-pointer",
                  "group",
                  styles.borderColor
                )}
                onClick={() => handleCardClick(highlight)}
              >
                {/* Importance Badge */}
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className={cn("gap-1", styles.bgColor)}>
                    <Icon className={cn("h-3 w-3", styles.color)} />
                    <span className="capitalize text-xs">{highlight.importance}</span>
                  </Badge>

                  {hasTimestamp && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {highlight.timestamp}
                    </Badge>
                  )}
                </div>

                {/* Quote */}
                <div className="min-h-[80px] mb-3">
                  <p className="text-sm leading-relaxed italic text-foreground/90">
                    &ldquo;{truncateQuote(highlight.quote)}&rdquo;
                  </p>
                </div>

                {/* Context (if available) */}
                {highlight.context && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {highlight.context}
                  </p>
                )}

                {/* Play Action */}
                {hasTimestamp && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium",
                        "text-primary group-hover:text-primary/80 transition-colors"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Play className="h-4 w-4 fill-current" />
                      </div>
                      <span>Play from {highlight.timestamp}</span>
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
