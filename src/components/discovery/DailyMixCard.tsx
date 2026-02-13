'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

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
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative w-[320px] sm:w-[400px] h-[200px] rounded-2xl overflow-hidden flex-shrink-0 group shadow-xl shadow-slate-200/50"
    >
      {/* Blurred Background */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-[0.6]"
        />
        {/* Internal Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <Link href={`/episode/${episodeId}/insights`} className="absolute inset-0 p-5 flex gap-4">
        {/* Podcast Artwork */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
          <Image
            src={artwork}
            alt={podcastName}
            fill
            unoptimized
            className="object-cover"
            sizes="112px"
          />
        </div>

        {/* Text Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0 text-white">
          <div>
            <p className="text-xs font-medium text-white/70 mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(publishedAt)}
            </p>
            <h3 className="font-bold text-lg leading-tight line-clamp-2 mb-1 drop-shadow-lg">
              {title}
            </h3>
            <p className="text-sm text-white/80 line-clamp-2">
              {description}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white/60 max-w-[200px] leading-tight break-words">
              {podcastName}
            </p>
            <Button
              size="sm"
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-0 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});
