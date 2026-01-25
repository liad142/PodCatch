"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface SpotifyShow {
  id: string;
  name: string;
  publisher: string;
  description?: string;
  images: { url: string; height?: number; width?: number }[];
  total_episodes?: number;
  external_urls?: { spotify?: string };
}

interface SpotifyShowCardProps {
  show: SpotifyShow;
  className?: string;
  priority?: boolean;
}

export function SpotifyShowCard({ show, className, priority = false }: SpotifyShowCardProps) {
  const imageUrl = show.images?.[0]?.url || "/placeholder-podcast.png";

  return (
    <Link
      href={`/browse/show/${show.id}`}
      className={cn(
        "group block p-3 rounded-lg transition-all duration-300",
        "bg-card/50 hover:bg-card",
        "hover:shadow-xl hover:shadow-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Cover Image */}
      <div className="relative aspect-square overflow-hidden rounded-md mb-3 bg-muted">
        <Image
          src={imageUrl}
          alt={show.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-300",
            "group-hover:scale-105"
          )}
        />

        {/* Play button overlay on hover */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          "bg-black/0 group-hover:bg-black/20 transition-colors duration-300"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-full bg-primary flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
            "transition-all duration-300 shadow-lg"
          )}>
            <svg
              className="w-5 h-5 text-primary-foreground ml-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
        {show.name}
      </h3>

      {/* Publisher */}
      <p className="text-xs text-muted-foreground line-clamp-1">
        {show.publisher}
      </p>
    </Link>
  );
}

// Loading skeleton for SpotifyShowCard
export function SpotifyShowCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-3 rounded-lg", className)}>
      <Skeleton className="aspect-square w-full rounded-md mb-3" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
