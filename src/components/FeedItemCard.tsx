'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, PlayIcon } from 'lucide-react';

interface FeedItem {
  id: string;
  sourceType: 'youtube' | 'podcast';
  sourceId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  duration?: number;
  url: string;
  videoId?: string;
  episodeId?: string;
  bookmarked: boolean;
}

interface FeedItemCardProps {
  item: FeedItem;
  onBookmarkToggle: (itemId: string) => void;
}

const FeedItemCard = React.memo(function FeedItemCard({ item, onBookmarkToggle }: FeedItemCardProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card variant="glass" className="group overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-slate-200 dark:bg-slate-700">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlayIcon className="w-16 h-16 text-slate-400" />
          </div>
        )}

        {/* Duration badge */}
        {item.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(item.duration)}
          </div>
        )}

        {/* Source type badge */}
        <div className="absolute top-2 left-2">
          <Badge
            variant={item.sourceType === 'youtube' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {item.sourceType === 'youtube' ? 'YouTube' : 'Podcast'}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight">
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 mb-4">
          <span>{formatDate(item.publishedAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => window.open(item.url, '_blank')}
          >
            <PlayIcon className="w-4 h-4 mr-1" />
            {item.sourceType === 'youtube' ? 'Watch' : 'Listen'}
          </Button>
          <Button
            size="sm"
            variant={item.bookmarked ? 'default' : 'outline'}
            onClick={() => onBookmarkToggle(item.id)}
            className="px-3"
          >
            <Heart
              className={`w-4 h-4 transition-all ${item.bookmarked ? 'fill-current' : ''}`}
            />
          </Button>
        </div>
      </div>
    </Card>
  );
});

export default FeedItemCard;
