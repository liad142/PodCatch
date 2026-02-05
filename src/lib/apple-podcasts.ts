/**
 * Apple Podcasts Client Library
 * Uses iTunes Search API for discovery and RSSHub for RSS feeds
 */

import Parser from 'rss-parser';
import { getCached, setCached, CacheKeys, CacheTTL, checkRateLimit as redisRateLimit } from '@/lib/cache';
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
// Rate limiting is handled by Redis via @/lib/cache
const MAX_FEED_SIZE = 50 * 1024 * 1024; // 50MB limit for XML feeds (large podcasts with 500+ episodes)

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

// Cache functions are now imported from @/lib/cache

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
  const cacheKey = CacheKeys.searchPodcasts(country, term, limit);

  // Check cache
  const cached = await getCached<ApplePodcast[]>(cacheKey);
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
    await setCached(cacheKey, podcasts, CacheTTL.SEARCH);

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
  const cacheKey = CacheKeys.topPodcasts(country, genreId, limit);

  // Check cache
  const cached = await getCached<ApplePodcast[]>(cacheKey);
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
    await setCached(cacheKey, podcasts, CacheTTL.TOP_PODCASTS);

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
  const cacheKey = CacheKeys.podcastDetails(podcastId, country);

  // Check Redis cache
  const cached = await getCached<ApplePodcast>(cacheKey);
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

    // Cache in Redis (persistent, shared across instances)
    await setCached(cacheKey, podcast, CacheTTL.PODCAST_DETAILS);

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
  const cacheKey = CacheKeys.podcastEpisodes(podcastId, limit);

  // Check Redis cache (shared across all instances)
  const cached = await getCached<AppleEpisode[]>(cacheKey);
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
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_FEED_SIZE) {
        throw new Error('Feed too large to process');
      }
      const feedXml = await response.text();
      if (feedXml.length > MAX_FEED_SIZE) {
        throw new Error('Feed content exceeds size limit');
      }
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
          const directContentLength = directResponse.headers.get('content-length');
          if (directContentLength && parseInt(directContentLength) > MAX_FEED_SIZE) {
            throw new Error('Feed too large to process');
          }
          const feedXml = await directResponse.text();
          if (feedXml.length > MAX_FEED_SIZE) {
            throw new Error('Feed content exceeds size limit');
          }
          feedData = await parser.parseString(feedXml) as unknown as RSSHubFeed;
        } else {
          throw new Error('No feed URL available');
        }
      } else {
        const rsshubContentLength = response.headers.get('content-length');
        if (rsshubContentLength && parseInt(rsshubContentLength) > MAX_FEED_SIZE) {
          throw new Error('Feed too large to process');
        }
        const feedXml = await response.text();
        if (feedXml.length > MAX_FEED_SIZE) {
          throw new Error('Feed content exceeds size limit');
        }
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

    // Cache in Redis (shared across all instances)
    await setCached(cacheKey, episodes, CacheTTL.EPISODES);

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
 * Rate limiter for API calls (distributed via Redis)
 */
export async function checkRateLimit(userId: string, maxRequests = 30, windowSeconds = 60): Promise<boolean> {
  return redisRateLimit(userId, maxRequests, windowSeconds);
}
