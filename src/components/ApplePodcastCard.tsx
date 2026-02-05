'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/contexts/SubscriptionContext';
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

export const ApplePodcastCard = React.memo(function ApplePodcastCard({ podcast, priority = false, className }: ApplePodcastCardProps) {
  const { isSubscribed, subscribe, unsubscribe } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const imageUrl = podcast.artworkUrl?.replace('100x100', '400x400') || '/placeholder-podcast.png';

  const subscribed = isSubscribed(podcast.id.toString());

  const handleLove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    try {
      if (subscribed) {
        await unsubscribe(podcast.id.toString());
      } else {
        await subscribe(podcast.id.toString());
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link href={`/browse/podcast/${podcast.id}`} className={cn('block group', className)}>
      <Card variant="glass" className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
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
            disabled={isLoading}
            className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              subscribed
                ? 'bg-red-500 text-white'
                : 'bg-black/50 hover:bg-black/70 text-white'
            }`}
            title={subscribed ? 'Remove from My Podcasts' : 'Add to My Podcasts'}
          >
            <Heart className={`w-5 h-5 ${subscribed ? 'fill-current' : ''}`} />
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
});
