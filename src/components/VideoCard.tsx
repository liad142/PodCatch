'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Play, Clock, Calendar, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoItem {
  videoId: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelName?: string;
  channelUrl?: string;
  url: string;
  duration?: number;
  bookmarked?: boolean;
}

interface VideoCardProps {
  video: VideoItem;
  onSave?: (video: VideoItem, saved: boolean) => void;
  userId?: string;
  className?: string;
}

export const VideoCard = React.memo(function VideoCard({ video, onSave, userId, className }: VideoCardProps) {
  const [isSaved, setIsSaved] = useState(video.bookmarked || false);
  const [isSaving, setIsSaving] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/youtube/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'demo-user-id',
          videoId: video.videoId,
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt,
          channelName: video.channelName,
          url: video.url,
          action: 'toggle',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.bookmarked);
        onSave?.(video, data.bookmarked);
      }
    } catch (err) {
      console.error('Failed to save video:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWatch = () => {
    window.open(video.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card variant="glass" className={cn(
      'group overflow-hidden transition-all duration-300',
      'hover:shadow-lg hover:-translate-y-1',
      className
    )}>
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
        
        {/* Play overlay */}
        <div 
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer"
          onClick={handleWatch}
        >
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-red-600 ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(video.duration)}
          </div>
        )}

        {/* YouTube badge */}
        <Badge 
          className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5"
        >
          YouTube
        </Badge>

        {/* Save button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            'absolute top-2 right-2 h-8 w-8 rounded-full transition-all duration-200',
            'bg-black/50 hover:bg-black/70',
            isSaved && 'bg-primary hover:bg-primary/90'
          )}
          aria-label={isSaved ? 'Remove from Saved' : 'Save video'}
        >
          <Bookmark 
            className={cn(
              'h-4 w-4 text-white',
              isSaved && 'fill-current',
              isSaving && 'animate-pulse'
            )} 
          />
        </Button>
      </div>

      {/* Content */}
      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <h3 
          className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors cursor-pointer"
          onClick={handleWatch}
        >
          {video.title}
        </h3>

        {/* Channel name */}
        {video.channelName && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {video.channelName}
          </p>
        )}

        {/* Metadata row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(video.publishedAt)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={handleWatch}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Watch
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
