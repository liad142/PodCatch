/**
 * RSSHub Client Library
 * Handles YouTube RSS feed fetching via RSSHub with caching and rate limiting
 */

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

const RSSHUB_BASE_URL = process.env.RSSHUB_BASE_URL || 'http://localhost:1200';
const CACHE_TTL_MINUTES = 30;

interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: Date;
  duration?: number;
  url: string;
}

interface YouTubeChannelInfo {
  channelId: string;
  channelName: string;
  channelUrl: string;
  channelHandle?: string;
  thumbnailUrl?: string;
  description?: string;
}

interface RSSHubFeed {
  title: string;
  description: string;
  link: string;
  items: Array<{
    title: string;
    link: string;
    pubDate: string;
    content?: string;
    contentSnippet?: string;
    guid?: string;
    isoDate?: string;
  }>;
  image?: {
    url: string;
  };
}

const parser = new Parser({
  customFields: {
    item: [
      ['media:group', 'mediaGroup'],
      ['yt:videoId', 'videoId'],
      ['yt:channelId', 'channelId'],
    ],
  },
});

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract YouTube channel ID from various URL formats
 */
export function extractChannelId(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{24})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract YouTube handle from URL or @handle string
 */
export function extractHandle(input: string): string | null {
  const patterns = [
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /^@([a-zA-Z0-9_-]+)$/,
    /^([a-zA-Z0-9_-]+)$/, // Plain handle without @
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const handle = match[1];
      return handle.startsWith('@') ? handle : `@${handle}`;
    }
  }

  return null;
}

/**
 * Parse YouTube input (URL, channel ID, or handle) and determine the type
 */
export function parseYouTubeInput(input: string): {
  type: 'channel' | 'handle' | 'unknown';
  value: string;
} {
  // Try channel ID first
  const channelId = extractChannelId(input);
  if (channelId) {
    return { type: 'channel', value: channelId };
  }

  // Try handle
  const handle = extractHandle(input);
  if (handle) {
    return { type: 'handle', value: handle };
  }

  return { type: 'unknown', value: input };
}

/**
 * Get cached RSSHub response or null if expired/missing
 */
async function getCachedResponse(cacheKey: string): Promise<RSSHubFeed | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('rsshub_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Expired, delete it
      await supabase.from('rsshub_cache').delete().eq('cache_key', cacheKey);
      return null;
    }

    return data.response_data as RSSHubFeed;
  } catch (err) {
    console.error('Cache read error:', err);
    return null;
  }
}

/**
 * Cache RSSHub response
 */
async function setCachedResponse(cacheKey: string, data: RSSHubFeed): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);

    await supabase.from('rsshub_cache').upsert({
      cache_key: cacheKey,
      response_data: data,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Cache write error:', err);
  }
}

/**
 * Fetch YouTube channel RSS feed via RSSHub
 */
export async function fetchYouTubeChannelFeed(
  channelIdOrHandle: string,
  useCache = true
): Promise<{ channel: YouTubeChannelInfo; videos: YouTubeVideo[] }> {
  const cacheKey = `youtube:${channelIdOrHandle}`;

  // Check cache first
  if (useCache) {
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return parseFeedData(cached, channelIdOrHandle);
    }
  }

  // Determine RSSHub endpoint
  const isChannelId = channelIdOrHandle.match(/^UC[a-zA-Z0-9_-]{22}$/);
  const endpoint = isChannelId
    ? `/youtube/channel/${channelIdOrHandle}`
    : `/youtube/user/${channelIdOrHandle}`;

  const url = `${RSSHUB_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PodCatch/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`RSSHub returned ${response.status}: ${response.statusText}`);
    }

    const feedXml = await response.text();
    const feed = await parser.parseString(feedXml);

    // Cache the response
    await setCachedResponse(cacheKey, feed as unknown as RSSHubFeed);

    return parseFeedData(feed as unknown as RSSHubFeed, channelIdOrHandle);
  } catch (err) {
    console.error('RSSHub fetch error:', err);
    throw new Error(`Failed to fetch YouTube feed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Parse RSS feed data into structured format
 */
function parseFeedData(
  feed: RSSHubFeed,
  channelIdOrHandle: string
): { channel: YouTubeChannelInfo; videos: YouTubeVideo[] } {
  // Extract channel info
  const channel: YouTubeChannelInfo = {
    channelId: channelIdOrHandle,
    channelName: feed.title || 'Unknown Channel',
    channelUrl: feed.link || `https://youtube.com/channel/${channelIdOrHandle}`,
    thumbnailUrl: feed.image?.url,
    description: feed.description,
  };

  // Parse videos
  const videos: YouTubeVideo[] = feed.items.map((item) => {
    const videoId = extractVideoId(item.link || '') || item.guid || '';
    const url = item.link || `https://youtube.com/watch?v=${videoId}`;

    return {
      videoId,
      title: item.title || 'Untitled',
      description: item.contentSnippet || item.content || '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
      url,
    };
  });

  return { channel, videos };
}

/**
 * Rate limiter using in-memory store (simple implementation)
 * In production, consider Redis for distributed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || userLimit.resetAt < now) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Clean up expired rate limit entries periodically
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [userId, limit] of rateLimitStore.entries()) {
    if (limit.resetAt < now) {
      rateLimitStore.delete(userId);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
