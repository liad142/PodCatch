'use client';

import { useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandBubble } from './BrandBubble';
import { ApplePodcast } from '@/components/ApplePodcastCard';

interface BrandShelfProps {
  podcasts: ApplePodcast[];
  isLoading?: boolean;
  title?: string;
}

export function BrandShelf({ podcasts, isLoading = false, title = 'Top Podcasts' }: BrandShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-h3 text-foreground">{title}</h2>
        <span className="text-body-sm text-primary font-medium hover:underline cursor-pointer">
          See All
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="w-20 h-20 rounded-full" />
              <Skeleton className="w-14 h-3" />
            </div>
          ))
          : podcasts.map((podcast) => (
            <div key={podcast.id}>
              <BrandBubble
                id={podcast.id}
                name={podcast.name}
                artworkUrl={podcast.artworkUrl}
              />
            </div>
          ))}
      </div>
    </section>
  );
}
