// ============================================================================
// Spotify Database Helper Functions
// Query and mutation helpers for Spotify cache tables
// ============================================================================

import { supabase, createServerClient } from "./supabase";
import type {
  DbSpotifyCategory,
  DbSpotifyShow,
  DbSpotifyEpisode,
  DbSpotifyCache,
  DbUserPreferences,
  DbSpotifyShowWithCategories,
  DbSpotifyShowWithEpisodes,
  DbSpotifyCategoryWithShows,
  SpotifyCategoryInput,
  SpotifyShowInput,
  SpotifyEpisodeInput,
  SpotifyCacheInput,
  UserPreferencesInput,
  SpotifyShowFilters,
  SpotifyEpisodeFilters,
  CacheKeyType,
} from "@/types/spotify";

// ============================================================================
// Cache Configuration
// ============================================================================

/** Default cache TTL in hours */
export const CACHE_TTL_HOURS = {
  categories: 24,      // Categories rarely change
  shows: 6,            // Shows update moderately
  episodes: 1,         // Episodes may be added frequently
  topShows: 12,        // Top shows list updates daily
} as const;

/**
 * Calculate expiration timestamp
 */
export function getExpirationTime(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

// ============================================================================
// Category Operations
// ============================================================================

/**
 * Get all categories
 */
export async function getCategories(): Promise<DbSpotifyCategory[]> {
  const { data, error } = await supabase
    .from("spotify_categories")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

/**
 * Get a category by ID
 */
export async function getCategoryById(
  id: string
): Promise<DbSpotifyCategory | null> {
  const { data, error } = await supabase
    .from("spotify_categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Get category with its shows
 */
export async function getCategoryWithShows(
  categoryId: string,
  market?: string
): Promise<DbSpotifyCategoryWithShows | null> {
  const { data: category, error: categoryError } = await supabase
    .from("spotify_categories")
    .select("*")
    .eq("id", categoryId)
    .single();

  if (categoryError) {
    if (categoryError.code === "PGRST116") return null;
    throw categoryError;
  }

  // Get shows for this category
  let query = supabase
    .from("spotify_show_categories")
    .select(`
      show_id,
      spotify_shows (*)
    `)
    .eq("category_id", categoryId);

  const { data: showRelations, error: showsError } = await query;
  if (showsError) throw showsError;

  // Filter by market if specified
  let shows = (showRelations ?? [])
    .map((r: { show_id: string; spotify_shows: DbSpotifyShow }) => r.spotify_shows)
    .filter(Boolean);

  if (market) {
    shows = shows.filter((show: DbSpotifyShow) =>
      show.available_markets.includes(market)
    );
  }

  return { ...category, shows };
}

/**
 * Upsert categories (insert or update)
 */
export async function upsertCategories(
  categories: SpotifyCategoryInput[]
): Promise<DbSpotifyCategory[]> {
  const client = createServerClient();
  const { data, error } = await client
    .from("spotify_categories")
    .upsert(categories, { onConflict: "id" })
    .select();

  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// Show Operations
// ============================================================================

/**
 * Get shows with optional filters
 */
export async function getShows(
  filters: SpotifyShowFilters = {}
): Promise<DbSpotifyShow[]> {
  const { market, language, categoryId, explicit, limit = 50, offset = 0 } = filters;

  let query = supabase.from("spotify_shows").select("*");

  // Filter by market (array contains)
  if (market) {
    query = query.contains("available_markets", [market]);
  }

  // Filter by language (array contains)
  if (language) {
    query = query.contains("languages", [language]);
  }

  // Filter by explicit content
  if (explicit !== undefined) {
    query = query.eq("explicit", explicit);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1).order("name");

  const { data, error } = await query;
  if (error) throw error;

  // Filter by category if specified (requires join)
  if (categoryId && data) {
    const { data: categoryShows } = await supabase
      .from("spotify_show_categories")
      .select("show_id")
      .eq("category_id", categoryId);

    const categoryShowIds = new Set(
      (categoryShows ?? []).map((cs: { show_id: string }) => cs.show_id)
    );
    return data.filter((show: DbSpotifyShow) => categoryShowIds.has(show.id));
  }

  return data ?? [];
}

/**
 * Get a show by ID
 */
export async function getShowById(id: string): Promise<DbSpotifyShow | null> {
  const { data, error } = await supabase
    .from("spotify_shows")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Get show with its episodes
 */
export async function getShowWithEpisodes(
  showId: string
): Promise<DbSpotifyShowWithEpisodes | null> {
  const { data: show, error: showError } = await supabase
    .from("spotify_shows")
    .select("*")
    .eq("id", showId)
    .single();

  if (showError) {
    if (showError.code === "PGRST116") return null;
    throw showError;
  }

  const { data: episodes, error: episodesError } = await supabase
    .from("spotify_episodes")
    .select("*")
    .eq("show_id", showId)
    .order("release_date", { ascending: false });

  if (episodesError) throw episodesError;

  return { ...show, episodes: episodes ?? [] };
}

/**
 * Get show with its categories
 */
export async function getShowWithCategories(
  showId: string
): Promise<DbSpotifyShowWithCategories | null> {
  const { data: show, error: showError } = await supabase
    .from("spotify_shows")
    .select("*")
    .eq("id", showId)
    .single();

  if (showError) {
    if (showError.code === "PGRST116") return null;
    throw showError;
  }

  const { data: categoryRelations, error: categoriesError } = await supabase
    .from("spotify_show_categories")
    .select(`
      category_id,
      spotify_categories (*)
    `)
    .eq("show_id", showId);

  if (categoriesError) throw categoriesError;

  const categories = (categoryRelations ?? [])
    .map((r: { category_id: string; spotify_categories: DbSpotifyCategory }) => r.spotify_categories)
    .filter(Boolean);

  return { ...show, categories };
}

/**
 * Upsert shows (insert or update)
 */
export async function upsertShows(
  shows: SpotifyShowInput[]
): Promise<DbSpotifyShow[]> {
  const client = createServerClient();
  const { data, error } = await client
    .from("spotify_shows")
    .upsert(shows, { onConflict: "id" })
    .select();

  if (error) throw error;
  return data ?? [];
}

/**
 * Link shows to categories
 */
export async function linkShowsToCategory(
  showIds: string[],
  categoryId: string
): Promise<void> {
  const client = createServerClient();
  const links = showIds.map((showId) => ({
    show_id: showId,
    category_id: categoryId,
  }));

  const { error } = await client
    .from("spotify_show_categories")
    .upsert(links, { onConflict: "show_id,category_id" });

  if (error) throw error;
}

// ============================================================================
// Episode Operations
// ============================================================================

/**
 * Get episodes with optional filters
 */
export async function getEpisodes(
  filters: SpotifyEpisodeFilters = {}
): Promise<DbSpotifyEpisode[]> {
  const { showId, explicit, limit = 50, offset = 0 } = filters;

  let query = supabase.from("spotify_episodes").select("*");

  if (showId) {
    query = query.eq("show_id", showId);
  }

  if (explicit !== undefined) {
    query = query.eq("explicit", explicit);
  }

  query = query
    .range(offset, offset + limit - 1)
    .order("release_date", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Get an episode by ID
 */
export async function getEpisodeById(
  id: string
): Promise<DbSpotifyEpisode | null> {
  const { data, error } = await supabase
    .from("spotify_episodes")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Get episodes for a show
 */
export async function getEpisodesByShowId(
  showId: string,
  limit = 50,
  offset = 0
): Promise<DbSpotifyEpisode[]> {
  return getEpisodes({ showId, limit, offset });
}

/**
 * Upsert episodes (insert or update)
 */
export async function upsertEpisodes(
  episodes: SpotifyEpisodeInput[]
): Promise<DbSpotifyEpisode[]> {
  const client = createServerClient();
  const { data, error } = await client
    .from("spotify_episodes")
    .upsert(episodes, { onConflict: "id" })
    .select();

  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get a cache entry by key
 */
export async function getCacheEntry<T = unknown>(
  cacheKey: CacheKeyType | string
): Promise<{ data: T; expired: boolean } | null> {
  const { data, error } = await supabase
    .from("spotify_cache")
    .select("*")
    .eq("cache_key", cacheKey)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const expired = new Date(data.expires_at) < new Date();
  return { data: data.data as T, expired };
}

/**
 * Get valid (non-expired) cache entry
 */
export async function getValidCacheEntry<T = unknown>(
  cacheKey: CacheKeyType | string
): Promise<T | null> {
  const entry = await getCacheEntry<T>(cacheKey);
  if (!entry || entry.expired) return null;
  return entry.data;
}

/**
 * Set a cache entry
 */
export async function setCacheEntry(
  input: SpotifyCacheInput
): Promise<DbSpotifyCache> {
  const client = createServerClient();
  const { data, error } = await client
    .from("spotify_cache")
    .upsert(input, { onConflict: "cache_key" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a cache entry
 */
export async function deleteCacheEntry(
  cacheKey: CacheKeyType | string
): Promise<void> {
  const client = createServerClient();
  const { error } = await client
    .from("spotify_cache")
    .delete()
    .eq("cache_key", cacheKey);

  if (error) throw error;
}

/**
 * Clean expired cache entries
 */
export async function cleanExpiredCache(): Promise<number> {
  const client = createServerClient();
  const { data, error } = await client.rpc("clean_expired_cache");

  if (error) throw error;
  return data ?? 0;
}

/**
 * Invalidate all cache entries matching a pattern
 */
export async function invalidateCacheByPattern(
  pattern: string
): Promise<void> {
  const client = createServerClient();
  const { error } = await client
    .from("spotify_cache")
    .delete()
    .like("cache_key", pattern);

  if (error) throw error;
}

// ============================================================================
// User Preferences Operations
// ============================================================================

/**
 * Get user preferences by anonymous user ID
 */
export async function getUserPreferences(
  userId: string
): Promise<DbUserPreferences | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Create or update user preferences
 */
export async function upsertUserPreferences(
  input: UserPreferencesInput
): Promise<DbUserPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      { ...input, country: input.country ?? "US" },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user country preference
 */
export async function updateUserCountry(
  userId: string,
  country: string
): Promise<DbUserPreferences> {
  return upsertUserPreferences({ user_id: userId, country });
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch upsert shows with their episodes and categories
 */
export async function batchUpsertShowsWithData(
  shows: SpotifyShowInput[],
  showEpisodes: Map<string, SpotifyEpisodeInput[]>,
  showCategories: Map<string, string[]>
): Promise<void> {
  const client = createServerClient();

  // Upsert all shows
  const { error: showsError } = await client
    .from("spotify_shows")
    .upsert(shows, { onConflict: "id" });

  if (showsError) throw showsError;

  // Collect all episodes
  const allEpisodes: SpotifyEpisodeInput[] = [];
  for (const episodes of showEpisodes.values()) {
    allEpisodes.push(...episodes);
  }

  // Upsert all episodes if any
  if (allEpisodes.length > 0) {
    const { error: episodesError } = await client
      .from("spotify_episodes")
      .upsert(allEpisodes, { onConflict: "id" });

    if (episodesError) throw episodesError;
  }

  // Collect all show-category links
  const categoryLinks: { show_id: string; category_id: string }[] = [];
  for (const [showId, categoryIds] of showCategories.entries()) {
    for (const categoryId of categoryIds) {
      categoryLinks.push({ show_id: showId, category_id: categoryId });
    }
  }

  // Upsert all category links if any
  if (categoryLinks.length > 0) {
    const { error: linksError } = await client
      .from("spotify_show_categories")
      .upsert(categoryLinks, { onConflict: "show_id,category_id" });

    if (linksError) throw linksError;
  }
}

// ============================================================================
// Search Operations
// ============================================================================

/**
 * Search shows by name
 */
export async function searchShows(
  query: string,
  market?: string,
  limit = 20
): Promise<DbSpotifyShow[]> {
  let dbQuery = supabase
    .from("spotify_shows")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(limit);

  if (market) {
    dbQuery = dbQuery.contains("available_markets", [market]);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data ?? [];
}

/**
 * Search episodes by name
 */
export async function searchEpisodes(
  query: string,
  showId?: string,
  limit = 20
): Promise<DbSpotifyEpisode[]> {
  let dbQuery = supabase
    .from("spotify_episodes")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(limit);

  if (showId) {
    dbQuery = dbQuery.eq("show_id", showId);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  expiredEntries: number;
  validEntries: number;
}> {
  const now = new Date().toISOString();

  const { count: totalEntries } = await supabase
    .from("spotify_cache")
    .select("*", { count: "exact", head: true });

  const { count: expiredEntries } = await supabase
    .from("spotify_cache")
    .select("*", { count: "exact", head: true })
    .lt("expires_at", now);

  return {
    totalEntries: totalEntries ?? 0,
    expiredEntries: expiredEntries ?? 0,
    validEntries: (totalEntries ?? 0) - (expiredEntries ?? 0),
  };
}

/**
 * Get counts of cached data
 */
export async function getDataCounts(): Promise<{
  categories: number;
  shows: number;
  episodes: number;
}> {
  const [categories, shows, episodes] = await Promise.all([
    supabase
      .from("spotify_categories")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("spotify_shows")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("spotify_episodes")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    categories: categories.count ?? 0,
    shows: shows.count ?? 0,
    episodes: episodes.count ?? 0,
  };
}
