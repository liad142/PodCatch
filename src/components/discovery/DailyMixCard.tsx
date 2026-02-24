'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';

interface DailyMixCardProps {
  episodeId: string;
  title: string;
  description: string;
  podcastName: string;
  podcastArtwork: string;
  podcastId: string;
  publishedAt: Date;
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return url.startsWith('/');
  }
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const DailyMixCard = React.memo(function DailyMixCard({
  episodeId,
  title,
  description,
  podcastName,
  podcastArtwork,
  podcastId,
  publishedAt,
}: DailyMixCardProps) {
  const artwork = isValidImageUrl(podcastArtwork) ? podcastArtwork : '/placeholder-podcast.png';

  return (
    <Link
      href={`/episode/${episodeId}/insights`}
      className="relative w-[340px] h-[200px] rounded-2xl overflow-hidden flex-shrink-0 bg-card border border-border shadow-[var(--shadow-1)] cursor-pointer hover:shadow-[var(--shadow-2)] transition-all duration-150 block"
    >
      {/* Blurred Background */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30"
        />
        <div className="absolute inset-0 bg-card/80" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        {/* Top row: avatar, podcast name, date */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
            <Image
              src={artwork}
              alt={podcastName}
              fill
              unoptimized
              className="object-cover"
              sizes="48px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm text-muted-foreground truncate">{podcastName}</p>
            <p className="text-caption text-muted-foreground">{formatDate(publishedAt)}</p>
          </div>
        </div>

        {/* Middle: episode title */}
        <h3 className="text-h4 text-foreground line-clamp-2">
          {title}
        </h3>

        {/* Bottom row: play button + duration placeholder */}
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
          </div>
          <p className="text-caption text-muted-foreground">
            {description?.slice(0, 50)}
          </p>
        </div>
      </div>
    </Link>
  );
});
