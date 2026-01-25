/**
 * Apple Podcasts Client Library
 * Uses iTunes Search API for discovery and RSSHub for RSS feeds
 */

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import {
  ApplePodcast,
  AppleEpisode,
  ApplePodcastFeed,
  ITunesSearchResponse,
  ITunesPodcast,
  AppleGenre,
  APPLE_PODCAST_GENRES,
} from '@/types/apple-podcasts';

const ITUNES_API_BASE = 'https://itunes.apple.com';
const RSSHUB_BASE_URL = process.env.RSSHUB_BASE_URL || 'http://localhost:1200';
const CACHE_TTL_MINUTES = 360; // 6 hours cache for Apple Podcasts top charts
const SEARCH_CACHE_TTL_MINUTES = 30; // 30 minutes cache for search results

interface RSSHubFeed {
  title: string;
  description: string;
  link: string;
  image?: { url: string };
  items: Array<{
    title: string;
    link: string;
    pubDate: string;
    content?: string;
    contentSnippet?: string;
    guid?: string;
    isoDate?: string;
    enclosure?: { url: string; type: string; length?: string };
    itunes?: {
      duration?: string;
      episode?: string;
      season?: string;
      image?: string;
    };
  }>;
}

const parser = new Parser({
  customFields: {
    item: [
      ['itunes:duration', 'duration'],
      ['itunes:episode', 'episode'],
      ['itunes:season', 'season'],
      ['itunes:image', 'itunesImage'],
    ],
  },
});

/**
 * Extract Apple Podcast ID from URL
 */
export function extractApplePodcastId(url: string): string | null {
  // Match patterns like:
  // https://podcasts.apple.com/us/podcast/the-daily/id1200361736
  // https://podcasts.apple.com/podcast/id1200361736
  const patterns = [
    /podcasts\.apple\.com\/.*\/podcast\/.*\/id(\d+)/,
    /podcasts\.apple\.com\/podcast\/id(\d+)/,
    /itunes\.apple\.com\/.*\/podcast\/.*\/id(\d+)/,
    /^(\d+)$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Get Supabase client for caching
 */
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;
  
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is required for caching operations');
  }
  
  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Get cached response or null if expired/missing
 */
async function getCachedResponse<T>(cacheKey: string): Promise<T | null> {
  try {
    const supabase = getSupabase();
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

    return data.response_data as T;
  } catch (err) {
    console.error('Apple Podcasts cache read error:', err);
    return null;
  }
}

/**
 * Cache response
 */
async function setCachedResponse<T>(cacheKey: string, data: T, ttlMinutes = CACHE_TTL_MINUTES): Promise<void> {
  try {
    const supabase = getSupabase();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await supabase.from('rsshub_cache').upsert({
      cache_key: cacheKey,
      response_data: data,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Apple Podcasts cache write error:', err);
  }
}

/**
 * Transform iTunes podcast to our format
 */
function transformITunesPodcast(itunes: ITunesPodcast): ApplePodcast {
  return {
    id: String(itunes.collectionId || itunes.trackId),
    name: itunes.collectionName || itunes.trackName,
    artistName: itunes.artistName,
    description: '', // iTunes search doesn't return full description
    artworkUrl: itunes.artworkUrl600 || itunes.artworkUrl100 || itunes.artworkUrl60,
    feedUrl: itunes.feedUrl,
    genres: itunes.genres || [itunes.primaryGenreName],
    trackCount: itunes.trackCount,
    country: itunes.country,
    contentAdvisoryRating: itunes.contentAdvisoryRating,
    releaseDate: itunes.releaseDate,
  };
}

/**
 * Search podcasts using iTunes Search API
 */
export async function searchPodcasts(
  term: string,
  country: string = 'us',
  limit: number = 20
): Promise<ApplePodcast[]> {
  const cacheKey = `apple:search:${country}:${term}:${limit}`;
  
  // Check cache
  const cached = await getCachedResponse<ApplePodcast[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL(`${ITUNES_API_BASE}/search`);
    url.searchParams.set('term', term);
    url.searchParams.set('country', country);
    url.searchParams.set('media', 'podcast');
    url.searchParams.set('entity', 'podcast');
    url.searchParams.set('limit', String(limit));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`iTunes API returned ${response.status}`);
    }

    const data: ITunesSearchResponse = await response.json();
    const podcasts = data.results.map(transformITunesPodcast);

    // Cache for 30 minutes (search results)
    await setCachedResponse(cacheKey, podcasts, SEARCH_CACHE_TTL_MINUTES);

    return podcasts;
  } catch (err) {
    console.error('iTunes search error:', err);
    throw new Error(`Failed to search podcasts: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Get top podcasts for a country using iTunes RSS feeds
 */
export async function getTopPodcasts(
  country: string = 'us',
  limit: number = 20,
  genreId?: string
): Promise<ApplePodcast[]> {
  const cacheKey = `apple:top:${country}:${genreId || 'all'}:${limit}`;
  
  // Check cache
  const cached = await getCachedResponse<ApplePodcast[]>(cacheKey);
  if (cached) return cached;

  try {
    // iTunes RSS feed for top podcasts
    // Format: https://itunes.apple.com/{country}/rss/toppodcasts/limit={limit}/genre={genreId}/json
    let url = `${ITUNES_API_BASE}/${country}/rss/toppodcasts/limit=${limit}`;
    if (genreId) {
      url += `/genre=${genreId}`;
    }
    url += '/json';

    const response = await fetch(url);
    if (!response.ok) {
      // Fallback to search if RSS feed fails
      console.warn(`iTunes RSS feed failed, falling back to search`);
      const genre = APPLE_PODCAST_GENRES.find(g => g.id === genreId);
      return searchPodcasts(genre?.name || 'podcast', country, limit);
    }

    const data = await response.json();
    const entries = data?.feed?.entry || [];

    const podcasts: ApplePodcast[] = entries.map((entry: any) => ({
      id: entry.id?.attributes?.['im:id'] || extractApplePodcastId(entry.id?.label || '') || '',
      name: entry['im:name']?.label || entry.title?.label || 'Unknown',
      artistName: entry['im:artist']?.label || '',
      description: entry.summary?.label || '',
      artworkUrl: entry['im:image']?.[2]?.label || entry['im:image']?.[1]?.label || entry['im:image']?.[0]?.label || '',
      genres: entry.category?.attributes?.label ? [entry.category.attributes.label] : [],
      trackCount: 0,
      country: country.toUpperCase(),
      releaseDate: entry['im:releaseDate']?.label,
    }));

    // Cache for 6 hours (top charts)
    await setCachedResponse(cacheKey, podcasts, CACHE_TTL_MINUTES);

    return podcasts;
  } catch (err) {
    console.error('iTunes top podcasts error:', err);
    throw new Error(`Failed to get top podcasts: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Get podcasts by genre
 */
export async function getPodcastsByGenre(
  genreId: string,
  country: string = 'us',
  limit: number = 20
): Promise<ApplePodcast[]> {
  return getTopPodcasts(country, limit, genreId);
}

/**
 * Get podcast details by ID using iTunes Lookup API
 */
export async function getPodcastById(podcastId: string, country: string = 'us'): Promise<ApplePodcast | null> {
  const cacheKey = `apple:podcast:${podcastId}:${country}`;
  
  // Check cache
  const cached = await getCachedResponse<ApplePodcast>(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL(`${ITUNES_API_BASE}/lookup`);
    url.searchParams.set('id', podcastId);
    url.searchParams.set('country', country);
    url.searchParams.set('entity', 'podcast');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`iTunes API returned ${response.status}`);
    }

    const data: ITunesSearchResponse = await response.json();
    if (data.resultCount === 0 || !data.results[0]) {
      return null;
    }

    const podcast = transformITunesPodcast(data.results[0]);

    // Cache for 24 hours
    await setCachedResponse(cacheKey, podcast, 24 * 60);

    return podcast;
  } catch (err) {
    console.error('iTunes lookup error:', err);
    throw new Error(`Failed to get podcast: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Parse duration string to seconds
 */
function parseDuration(duration: string | undefined): number {
  if (!duration) return 0;
  
  // Format: HH:MM:SS or MM:SS or seconds
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(duration, 10) || 0;
}

/**
 * Get podcast episodes via RSSHub or direct feed
 */
export async function getPodcastEpisodes(
  podcastId: string,
  feedUrl?: string,
  limit: number = 20
): Promise<AppleEpisode[]> {
  const cacheKey = `apple:episodes:${podcastId}:${limit}`;
  
  // Check cache
  const cached = await getCachedResponse<AppleEpisode[]>(cacheKey);
  if (cached) return cached;

  try {
    let feedData: RSSHubFeed;

    if (feedUrl) {
      // Use direct feed URL if available
      const response = await fetch(feedUrl, {
        headers: { 'User-Agent': 'PodCatch/1.0' },
      });
      if (!response.ok) {
        throw new Error(`Feed fetch failed: ${response.status}`);
      }
      const feedXml = await response.text();
      feedData = await parser.parseString(feedXml) as unknown as RSSHubFeed;
    } else {
      // Try RSSHub Apple Podcasts route
      const rsshubUrl = `${RSSHUB_BASE_URL}/apple/podcast/${podcastId}`;
      const response = await fetch(rsshubUrl, {
        headers: { 'User-Agent': 'PodCatch/1.0' },
      });
      
      if (!response.ok) {
        // Fallback: Get feed URL from iTunes and fetch directly
        const podcast = await getPodcastById(podcastId);
        if (podcast?.feedUrl) {
          const directResponse = await fetch(podcast.feedUrl, {
            headers: { 'User-Agent': 'PodCatch/1.0' },
          });
          if (!directResponse.ok) {
            throw new Error(`Direct feed fetch failed: ${directResponse.status}`);
          }
          const feedXml = await directResponse.text();
          feedData = await parser.parseString(feedXml) as unknown as RSSHubFeed;
        } else {
          throw new Error('No feed URL available');
        }
      } else {
        const feedXml = await response.text();
        feedData = await parser.parseString(feedXml) as unknown as RSSHubFeed;
      }
    }

    const episodes: AppleEpisode[] = feedData.items.slice(0, limit).map((item, index) => ({
      id: item.guid || `${podcastId}-${index}`,
      podcastId,
      title: item.title || 'Untitled Episode',
      description: item.contentSnippet || item.content || '',
      publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
      duration: parseDuration((item as any).duration),
      audioUrl: item.enclosure?.url,
      artworkUrl: (item as any).itunesImage?.href || feedData.image?.url,
      episodeNumber: parseInt((item as any).episode, 10) || undefined,
      seasonNumber: parseInt((item as any).season, 10) || undefined,
    }));

    // Cache for 1 hour
    await setCachedResponse(cacheKey, episodes, 60);

    return episodes;
  } catch (err) {
    console.error('Podcast episodes fetch error:', err);
    throw new Error(`Failed to get episodes: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Get full podcast with episodes
 */
export async function getPodcastFeed(
  podcastId: string,
  country: string = 'us',
  episodeLimit: number = 20
): Promise<ApplePodcastFeed | null> {
  const podcast = await getPodcastById(podcastId, country);
  if (!podcast) return null;

  const episodes = await getPodcastEpisodes(podcastId, podcast.feedUrl, episodeLimit);

  return { podcast, episodes };
}

/**
 * Get available genres
 */
export function getGenres(): AppleGenre[] {
  return APPLE_PODCAST_GENRES;
}

/**
 * Rate limiter for API calls
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string, maxRequests = 30, windowMs = 60000): boolean {
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
