"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar } from "lucide-react";

export interface SpotifyEpisode {
  id: string;
  name: string;
  description: string;
  release_date: string;
  duration_ms: number;
  images?: { url: string; height?: number; width?: number }[];
  external_urls?: { spotify?: string };
  html_description?: string;
}

interface SpotifyEpisodeCardProps {
  episode: SpotifyEpisode;
  showImage?: string;
  className?: string;
  onClick?: () => void;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SpotifyEpisodeCard({
  episode,
  showImage,
  className,
  onClick,
}: SpotifyEpisodeCardProps) {
  const imageUrl = episode.images?.[0]?.url || showImage || "/placeholder-podcast.png";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={cn(
        "group flex gap-4 p-4 rounded-lg transition-all duration-200",
        "bg-card/30 hover:bg-card/80",
        "border border-transparent hover:border-border/50",
        onClick && "cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Episode Image */}
      <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={episode.name}
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {episode.name}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
          {episode.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(episode.release_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(episode.duration_ms)}
          </span>
        </div>
      </div>

      {/* Play button on hover (optional visual) */}
      <div className="hidden sm:flex items-center">
        <div
          className={cn(
            "w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          )}
        >
          <svg
            className="w-4 h-4 text-primary ml-0.5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for SpotifyEpisodeCard
export function SpotifyEpisodeCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-4 p-4 rounded-lg bg-card/30", className)}>
      <Skeleton className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-md" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-2/3 mb-3" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
