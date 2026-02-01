'use client';

import { useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandBubble } from './BrandBubble';
import { ApplePodcast } from '@/components/ApplePodcastCard';

interface BrandShelfProps {
  podcasts: ApplePodcast[];
  isLoading?: boolean;
}

export function BrandShelf({ podcasts, isLoading = false }: BrandShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Top Podcasts</h2>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full" />
                <Skeleton className="w-14 h-3" />
              </div>
            ))
          : podcasts.map((podcast) => (
              <BrandBubble
                key={podcast.id}
                id={podcast.id}
                name={podcast.name}
                artworkUrl={podcast.artworkUrl}
              />
            ))}
      </div>
    </section>
  );
}
