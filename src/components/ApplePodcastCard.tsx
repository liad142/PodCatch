'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ApplePodcast {
  id: string;
  name: string;
  artistName: string;
  description?: string;
  artworkUrl: string;
  genres?: string[];
  trackCount?: number;
  contentAdvisoryRating?: string;
  feedUrl?: string;
}

interface ApplePodcastCardProps {
  podcast: ApplePodcast;
  priority?: boolean;
  className?: string;
}

export function ApplePodcastCard({ podcast, priority = false, className }: ApplePodcastCardProps) {
  const [isLoved, setIsLoved] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const imageUrl = podcast.artworkUrl?.replace('100x100', '400x400') || '/placeholder-podcast.png';

  const handleLove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdding || isLoved) return;

    setIsAdding(true);
    try {
      // Save Apple podcasts with apple:ID format so the podcast page can fetch episodes
      const appleRssUrl = `apple:${podcast.id}`;

      // Add podcast to My Podcasts using the existing API
      const addResponse = await fetch('/api/podcasts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rss_url: appleRssUrl }),
      });

      if (addResponse.ok) {
        setIsLoved(true);
      } else {
        const errorData = await addResponse.json();
        // If already exists, mark as loved
        if (errorData.error?.includes('already')) {
          setIsLoved(true);
        } else {
          console.error('Failed to add podcast:', errorData);
        }
      }
    } catch (err) {
      console.error('Error adding podcast:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Link href={`/browse/podcast/${podcast.id}`} className={cn('block group', className)}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card/50 backdrop-blur border-0 shadow-sm">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={imageUrl}
            alt={podcast.name}
            fill
            sizes="(max-width: 640px) 160px, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
            unoptimized={imageUrl.includes('mzstatic.com')}
          />
          {podcast.contentAdvisoryRating === 'Explicit' && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 bg-red-500/90 text-white text-xs px-1.5 py-0.5"
            >
              E
            </Badge>
          )}
          {/* Love Button */}
          <button
            onClick={handleLove}
            disabled={isAdding || isLoved}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isLoved
                ? 'bg-red-500 text-white'
                : 'bg-black/50 text-white hover:bg-red-500 hover:scale-110',
              isAdding && 'opacity-50 cursor-wait'
            )}
            aria-label={isLoved ? 'Added to My Podcasts' : 'Add to My Podcasts'}
          >
            <Heart 
              className={cn(
                'h-4 w-4 transition-all',
                isLoved && 'fill-current'
              )} 
            />
          </button>
        </div>
        <CardContent className="p-3 space-y-1">
          <h3 className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {podcast.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {podcast.artistName}
          </p>
          {podcast.genres && podcast.genres.length > 0 && (
            <p className="text-xs text-muted-foreground/70 line-clamp-1">
              {podcast.genres[0]}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
