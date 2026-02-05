/**
 * GET /api/youtube/trending
 * Fetch trending YouTube videos via RSSHub
 * Uses YouTube trending feed or popular channels as fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { getCached, setCached, CacheKeys, CacheTTL } from '@/lib/cache';

const RSSHUB_BASE_URL = process.env.RSSHUB_BASE_URL || 'http://localhost:1200';
// TTL comes from CacheTTL.YOUTUBE_TRENDING

interface TrendingVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelName: string;
  channelUrl: string;
  url: string;
  duration?: number;
}

const parser = new Parser();

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
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
 * Fetch trending from RSSHub YouTube trending endpoint
 * Falls back to popular tech channels if trending unavailable
 */
async function fetchTrendingVideos(country: string, limit: number): Promise<TrendingVideo[]> {
  const videos: TrendingVideo[] = [];

  // RSSHub YouTube trending endpoints by region
  const rsshubTrendingUrl = `${RSSHUB_BASE_URL}/youtube/trending/${country}`;

  try {
    const response = await fetch(rsshubTrendingUrl, {
      headers: { 'User-Agent': 'PodCatch/1.0' },
    });

    if (response.ok) {
      const feedXml = await response.text();
      const feed = await parser.parseString(feedXml);

      for (const item of (feed.items || []).slice(0, limit)) {
        const videoId = extractVideoId(item.link || '') || item.guid || '';
        videos.push({
          videoId,
          title: item.title || 'Untitled',
          description: item.contentSnippet || item.content || '',
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          publishedAt: new Date(item.isoDate || item.pubDate || Date.now()).toISOString(),
          channelName: item.author || 'YouTube',
          channelUrl: `https://youtube.com`,
          url: item.link || `https://youtube.com/watch?v=${videoId}`,
        });
      }
    }
  } catch (err) {
    console.error('RSSHub trending fetch error:', err);
  }

  // If we got enough videos, return them
  if (videos.length >= limit) {
    return videos.slice(0, limit);
  }

  // Fallback: Fetch from popular tech/podcast-related channels
  const fallbackChannels = [
    '@TED', // TED Talks
    '@TEDxTalks',
    '@veritasium',
    '@vsauce',
    '@mkbhd',
    '@LinusTechTips',
  ];

  for (const channelHandle of fallbackChannels) {
    if (videos.length >= limit) break;

    try {
      const channelUrl = `${RSSHUB_BASE_URL}/youtube/user/${channelHandle}`;
      const response = await fetch(channelUrl, {
        headers: { 'User-Agent': 'PodCatch/1.0' },
      });

      if (response.ok) {
        const feedXml = await response.text();
        const feed = await parser.parseString(feedXml);
        const channelName = feed.title || channelHandle;

        for (const item of (feed.items || []).slice(0, 3)) {
          if (videos.length >= limit) break;

          const videoId = extractVideoId(item.link || '') || item.guid || '';

          // Avoid duplicates
          if (videos.some(v => v.videoId === videoId)) continue;

          videos.push({
            videoId,
            title: item.title || 'Untitled',
            description: item.contentSnippet || item.content || '',
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            publishedAt: new Date(item.isoDate || item.pubDate || Date.now()).toISOString(),
            channelName,
            channelUrl: `https://youtube.com/${channelHandle}`,
            url: item.link || `https://youtube.com/watch?v=${videoId}`,
          });
        }
      }
    } catch (err) {
      console.error(`Error fetching fallback channel ${channelHandle}:`, err);
    }
  }

  // Sort by published date (newest first)
  videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return videos.slice(0, limit);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const country = (searchParams.get('country') || 'US').toUpperCase();

    // Check Redis cache
    const cacheKey = CacheKeys.youtubeTrending(country, limit);
    const cached = await getCached<TrendingVideo[]>(cacheKey);

    if (cached && cached.length > 0) {
      return NextResponse.json({
        success: true,
        videos: cached,
        count: cached.length,
        source: 'cache',
      });
    }

    // Fetch fresh data
    const videos = await fetchTrendingVideos(country, limit);

    // Cache the result
    if (videos.length > 0) {
      await setCached(cacheKey, videos, CacheTTL.YOUTUBE_TRENDING);
    }

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
      source: 'fresh',
    });
  } catch (error) {
    console.error('YouTube trending error:', error);

    // Return empty array with friendly message instead of crashing
    return NextResponse.json({
      success: false,
      videos: [],
      count: 0,
      message: 'Unable to load trending videos. Please try again later.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
