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
      <Card className="bg-white dark:bg-[#1e202e] border-slate-100 dark:border-white/5 shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.12)] hover:border-violet-100 dark:hover:border-violet-500/20 overflow-hidden transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-white/5">
          <Image
            src={imageUrl}
            alt={podcast.name}
            fill
            sizes="(max-width: 640px) 160px, 180px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
            unoptimized={imageUrl.includes('mzstatic.com')}
          />
          {podcast.contentAdvisoryRating === 'Explicit' && (
            <Badge
              variant="destructive"
              className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-bold shadow-sm"
            >
              Explicit
            </Badge>
          )}
          {/* Love Button */}
          <button
            onClick={handleLove}
            disabled={isLoading}
            className={cn(
              "absolute top-2 right-2 p-2 rounded-full transition-all duration-300 shadow-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
              isLoading ? 'opacity-50 cursor-not-allowed' : '',
              subscribed
                ? 'bg-white dark:bg-[#27293d] text-rose-500 opacity-100 translate-y-0 shadow-md'
                : 'bg-white/90 dark:bg-[#1e202e]/90 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-[#27293d]'
            )}
            title={subscribed ? 'Remove from My Podcasts' : 'Add to My Podcasts'}
          >
            <Heart className={cn("w-4 h-4", subscribed && "fill-current")} />
          </button>
        </div>
        <div className="p-4 space-y-1.5">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight group-hover:text-violet-700 transition-colors">
            {podcast.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
            {podcast.artistName}
          </p>
          {podcast.genres && podcast.genres.length > 0 && (
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold line-clamp-1">
              {podcast.genres[0]}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
});
