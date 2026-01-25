import { createServerClient } from "@/lib/supabase";
import { CacheEntry } from "@/types/spotify";

// Default cache TTL in hours (can be overridden by env variable)
const DEFAULT_CACHE_TTL_HOURS = 6;

function getCacheTTLHours(): number {
  const envTTL = process.env.CACHE_TTL_HOURS;
  if (envTTL) {
    const parsed = parseInt(envTTL, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_CACHE_TTL_HOURS;
}

/**
 * Generate a cache key from the endpoint and parameters
 */
export function generateCacheKey(endpoint: string, params: Record<string, string | number | undefined>): string {
  const sortedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return `spotify:${endpoint}${sortedParams ? ":" + sortedParams : ""}`;
}

/**
 * Get cached data if it exists and hasn't expired
 */
export async function getCached<T>(cacheKey: string): Promise<T | null> {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("spotify_cache")
      .select("data, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if cache has expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Cache expired, delete it
      await supabase.from("spotify_cache").delete().eq("cache_key", cacheKey);
      return null;
    }

    return data.data as T;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

/**
 * Store data in cache with TTL
 */
export async function setCache<T>(
  cacheKey: string,
  data: T,
  ttlHours?: number
): Promise<void> {
  try {
    const supabase = createServerClient();
    const hours = ttlHours ?? getCacheTTLHours();
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const { error } = await supabase.from("spotify_cache").upsert(
      {
        cache_key: cacheKey,
        data: data,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: "cache_key",
      }
    );

    if (error) {
      console.error("Cache set error:", error);
    }
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

/**
 * Delete a specific cache entry
 */
export async function invalidateCache(cacheKey: string): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase.from("spotify_cache").delete().eq("cache_key", cacheKey);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

/**
 * Delete cache entries matching a pattern (prefix)
 */
export async function invalidateCacheByPrefix(prefix: string): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase
      .from("spotify_cache")
      .delete()
      .like("cache_key", `${prefix}%`);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("spotify_cache")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("cache_key");

    if (error) {
      console.error("Cache cleanup error:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Cache cleanup error:", error);
    return 0;
  }
}

/**
 * Wrapper function that checks cache first, then calls the API function
 */
export async function withCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlHours?: number
): Promise<{ data: T; cached: boolean }> {
  // Try to get from cache first
  const cachedData = await getCached<T>(cacheKey);
  if (cachedData !== null) {
    return { data: cachedData, cached: true };
  }

  // Cache miss, fetch fresh data
  const freshData = await fetchFn();

  // Store in cache (don't await to avoid blocking response)
  setCache(cacheKey, freshData, ttlHours).catch((error) => {
    console.error("Failed to cache data:", error);
  });

  return { data: freshData, cached: false };
}
