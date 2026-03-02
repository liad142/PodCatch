import type { Podcast } from '@/types/database';

/**
 * Check if a podcast is YouTube-based content
 */
export function isYouTubeContent(podcast?: Podcast | null): boolean {
  return !!podcast?.rss_feed_url?.startsWith('youtube:channel:');
}

/**
 * Extract YouTube video ID from a YouTube URL
 * Handles: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

/**
 * Get YouTube thumbnail URL for a video
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'
): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}
