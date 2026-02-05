"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Podcast } from "@/types/database";
import { Mic2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PodcastCardProps {
  podcast: Podcast & { episode_count?: number };
  onRemove?: (id: string) => void;
  hasNewEpisodes?: boolean;
}

export const PodcastCard = React.memo(function PodcastCard({ podcast, onRemove, hasNewEpisodes }: PodcastCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRemoving || !onRemove) return;
    
    setIsRemoving(true);
    try {
      const response = await fetch(`/api/podcasts/${podcast.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        onRemove(podcast.id);
      } else {
        console.error('Failed to remove podcast');
      }
    } catch (err) {
      console.error('Error removing podcast:', err);
    } finally {
      setIsRemoving(false);
    }
  };
  // Handle image_url that might be an array or invalid
  let imageUrl: string | null = null;
  const rawImageUrl = podcast.image_url;
  
  if (rawImageUrl) {
    try {
      // If it's already an array, get the first element
      if (Array.isArray(rawImageUrl)) {
        imageUrl = rawImageUrl[0] || null;
      }
      // If it's a JSON array string, extract the first URL
      else if (typeof rawImageUrl === 'string' && rawImageUrl.startsWith('[')) {
        const parsed = JSON.parse(rawImageUrl);
        imageUrl = Array.isArray(parsed) ? parsed[0] : rawImageUrl;
      }
      // Otherwise, use it as-is
      else {
        imageUrl = rawImageUrl;
      }
      
      // Validate URL
      if (imageUrl) {
        new URL(imageUrl);
      }
    } catch {
      imageUrl = null;
    }
  }

  return (
    <Link href={`/podcast/${podcast.id}`}>
      <Card variant="glass" className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
        <CardHeader className="p-0">
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={podcast.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Mic2 className="h-16 w-16 text-primary/40" />
              </div>
            )}
            {/* NEW Badge */}
            {hasNewEpisodes && (
              <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                NEW
              </div>
            )}
            {/* Remove Button */}
            {onRemove && (
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className={cn(
                  'absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200',
                  'bg-black/50 text-white hover:bg-red-500 hover:scale-110',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isRemoving && 'opacity-50 cursor-wait'
                )}
                aria-label="Remove from My Podcasts"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {podcast.title}
          </h3>
          {podcast.author && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {podcast.author}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {podcast.episode_count !== undefined && (
              <Badge variant="secondary">
                {podcast.episode_count} episode{podcast.episode_count !== 1 ? "s" : ""}
              </Badge>
            )}
            {podcast.language && (
              <Badge variant="outline">{podcast.language.toUpperCase()}</Badge>
            )}
          </div>
          {podcast.description && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {podcast.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});
