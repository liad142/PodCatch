'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DailyMixCard } from './DailyMixCard';
import { cn } from '@/lib/utils';

interface Episode {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  podcastId: string;
  podcastName: string;
  podcastArtwork: string;
}

interface DailyMixCarouselProps {
  episodes: Episode[];
  isLoading?: boolean;
}

export function DailyMixCarousel({ episodes, isLoading = false }: DailyMixCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, episodes]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Daily Mix</h2>
          <p className="text-sm text-muted-foreground">Fresh summaries picked for you</p>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-full', !canScrollLeft && 'opacity-40')}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-full', !canScrollRight && 'opacity-40')}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-[320px] sm:w-[400px] h-[200px] rounded-2xl flex-shrink-0" />
            ))
          : episodes.map((ep) => (
              <div key={ep.id} className="snap-start">
                <DailyMixCard
                  episodeId={ep.id}
                  title={ep.title}
                  description={ep.description}
                  podcastName={ep.podcastName}
                  podcastArtwork={ep.podcastArtwork}
                  podcastId={ep.podcastId}
                  publishedAt={ep.publishedAt}
                />
              </div>
            ))}
      </div>
    </section>
  );
}
