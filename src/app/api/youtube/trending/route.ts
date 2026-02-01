/**
 * GET /api/youtube/trending
 * Fetch trending YouTube videos via RSSHub
 * Uses YouTube trending feed or popular channels as fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { createServerClient } from '@/lib/supabase';

const RSSHUB_BASE_URL = process.env.RSSHUB_BASE_URL || 'http://localhost:1200';
const CACHE_TTL_MINUTES = 30;

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

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  isoDate?: string;
  author?: string;
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
 * Get cached response or null if expired
 */
async function getCachedResponse(cacheKey: string): Promise<TrendingVideo[] | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('rsshub_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      await supabase.from('rsshub_cache').delete().eq('cache_key', cacheKey);
      return null;
    }

    return data.response_data as TrendingVideo[];
  } catch (err) {
    console.error('Trending cache read error:', err);
    return null;
  }
}

/**
 * Cache response
 */
async function setCachedResponse(cacheKey: string, data: TrendingVideo[]): Promise<void> {
  try {
    const supabase = createServerClient();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);

    await supabase.from('rsshub_cache').upsert({
      cache_key: cacheKey,
      response_data: data,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Trending cache write error:', err);
  }
}

/**
 * Fetch trending from RSSHub YouTube trending endpoint
 * Falls back to popular tech channels if trending unavailable
 */
async function fetchTrendingVideos(country: string, limit: number): Promise<TrendingVideo[]> {
  const videos: TrendingVideo[] = [];

  // RSSHub YouTube trending endpoints by region
  // Format: /youtube/trending/:region/:embed?
  // Regions: default, music, gaming, news, movies
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

    // Check cache first
    const cacheKey = `youtube:trending:${country}:${limit}`;
    const cached = await getCachedResponse(cacheKey);
    
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
      await setCachedResponse(cacheKey, videos);
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
