/**
 * Centralized Cache Utility
 * Uses Upstash Redis via Vercel Marketplace integration
 * 
 * Env vars (auto-injected by Vercel):
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from '@upstash/redis';

// Singleton Redis client
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables');
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
}

const isDev = process.env.NODE_ENV === 'development';

function logCache(action: string, key: string, extra?: string) {
  if (isDev) {
    console.log(`[CACHE ${action}] ${key}${extra ? ` - ${extra}` : ''}`);
  }
}

/**
 * Get cached value from Redis
 * Returns null on cache miss or error (graceful degradation)
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    const cached = await client.get<T>(key);
    
    logCache(cached ? 'HIT' : 'MISS', key);
    return cached;
  } catch (error) {
    console.error('[CACHE ERROR] Failed to get:', key, error);
    return null; // Graceful fallback - don't break the app
  }
}

/**
 * Set cached value in Redis with TTL
 * @param key - Cache key
 * @param value - Value to cache (will be JSON serialized)
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds = 3600
): Promise<void> {
  try {
    const client = getRedis();
    await client.set(key, value, { ex: ttlSeconds });
    logCache('SET', key, `TTL: ${ttlSeconds}s`);
  } catch (error) {
    console.error('[CACHE ERROR] Failed to set:', key, error);
    // Don't throw - cache failures shouldn't break the app
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    const client = getRedis();
    await client.del(key);
    logCache('DELETE', key);
  } catch (error) {
    console.error('[CACHE ERROR] Failed to delete:', key, error);
  }
}

/**
 * Check if key exists in cache
 */
export async function hasCached(key: string): Promise<boolean> {
  try {
    const client = getRedis();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('[CACHE ERROR] Failed to check existence:', key, error);
    return false;
  }
}

/**
 * Get multiple cached values at once
 */
export async function getCachedMulti<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  
  try {
    const client = getRedis();
    const values = await client.mget<T[]>(...keys);
    
    keys.forEach((key, i) => {
      logCache(values[i] ? 'HIT' : 'MISS', key);
    });
    
    return values;
  } catch (error) {
    console.error('[CACHE ERROR] Failed to mget:', keys, error);
    return keys.map(() => null);
  }
}

/**
 * Cache key builders for consistent naming
 */
export const CacheKeys = {
  searchPodcasts: (country: string, term: string, limit: number) =>
    `apple:search:${country.toLowerCase()}:${term}:${limit}`,

  topPodcasts: (country: string, genreId: string | undefined, limit: number) =>
    `apple:top:${country.toLowerCase()}:${genreId || 'all'}:${limit}`,

  podcastEpisodes: (podcastId: string) =>
    `apple:episodes:${podcastId}`,

  podcastDetails: (podcastId: string, country: string) =>
    `apple:podcast:${podcastId}:${country.toLowerCase()}`,

  youtubeFeed: (channelIdOrHandle: string) =>
    `youtube:${channelIdOrHandle}`,

  youtubeTrending: (country: string, limit: number) =>
    `youtube:trending:${country}:${limit}`,

  batchEpisodes: (country: string, hash: string) =>
    `batch:episodes:${country}:${hash}`,

  // Podcastindex cache keys
  piSearch: (term: string, limit: number) =>
    `pi:search:${term}:${limit}`,

  piTrending: (limit: number, category?: string) =>
    `pi:trending:${limit}:${category || 'all'}`,

  piEpisodes: (feedId: string) =>
    `pi:episodes:${feedId}`,

  piPodcast: (feedId: string) =>
    `pi:podcast:${feedId}`,

  unifiedSearch: (term: string, country: string, limit: number) =>
    `unified:search:${country.toLowerCase()}:${term}:${limit}`,
};

/**
 * TTL constants (in seconds)
 */
export const CacheTTL = {
  SEARCH: 1800,            // 30 minutes
  TOP_PODCASTS: 3600,      // 1 hour
  EPISODES: 3600,          // 1 hour
  PODCAST_DETAILS: 3600,   // 1 hour
  YOUTUBE_FEED: 1800,      // 30 minutes
  YOUTUBE_TRENDING: 1800,  // 30 minutes
  BATCH_REQUESTS: 900,     // 15 minutes

  // Podcastindex TTLs
  PI_SEARCH: 1800,           // 30 minutes
  PI_TRENDING: 3600,         // 1 hour
  PI_EPISODES: 3600,         // 1 hour
  PI_PODCAST: 3600,          // 1 hour
  UNIFIED_SEARCH: 900,       // 15 minutes
};

/**
 * Distributed rate limiter using Redis
 * Uses a sliding window counter via INCR + EXPIRE
 * Returns true if the request is allowed, false if rate limited
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowSeconds: number = 60
): Promise<boolean> {
  try {
    const client = getRedis();
    const key = `ratelimit:${identifier}`;

    // Atomic: SET NX creates key with TTL only if it doesn't exist
    await client.set(key, 0, { ex: windowSeconds, nx: true });
    // INCR is atomic - no race between read and write
    const count = await client.incr(key);

    return count <= maxRequests;
  } catch (error) {
    console.error('[CACHE ERROR] Rate limit check failed:', identifier, error);
    // Fail open - allow the request if Redis is down
    return true;
  }
}

/**
 * Get Redis health info for admin dashboard
 */
export async function getCacheHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  cacheKeys: number;
}> {
  try {
    const client = getRedis();
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;
    const cacheKeys = await client.dbsize();
    return { connected: true, latencyMs, cacheKeys };
  } catch {
    return { connected: false, latencyMs: -1, cacheKeys: 0 };
  }
}
