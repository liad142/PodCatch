// ============================================================================
// Spotify API Types (from Spotify Web API)
// ============================================================================

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyCategory {
  id: string;
  name: string;
  icons: SpotifyImage[];
  href: string;
}

export interface SpotifyCategoriesResponse {
  categories: {
    href: string;
    items: SpotifyCategory[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
  };
}

export interface SpotifyShow {
  id: string;
  name: string;
  description: string;
  html_description: string;
  publisher: string;
  images: SpotifyImage[];
  languages: string[];
  explicit: boolean;
  total_episodes: number;
  media_type: string;
  type: "show";
  uri: string;
  href: string;
  external_urls: {
    spotify: string;
  };
  available_markets?: string[];
  copyrights?: Array<{ text: string; type: string }>;
  is_externally_hosted?: boolean;
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  description: string;
  html_description: string;
  duration_ms: number;
  release_date: string;
  release_date_precision: "year" | "month" | "day";
  explicit: boolean;
  images: SpotifyImage[];
  languages: string[];
  audio_preview_url: string | null;
  type: "episode";
  uri: string;
  href: string;
  external_urls: {
    spotify: string;
  };
  is_playable?: boolean;
  is_externally_hosted?: boolean;
  show?: SpotifyShow;
}

export interface SpotifyShowsResponse {
  shows: SpotifyShow[];
}

export interface SpotifySearchResponse {
  shows?: {
    href: string;
    items: SpotifyShow[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
  };
}

export interface SpotifyEpisodesResponse {
  href: string;
  items: SpotifyEpisode[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CachedToken {
  access_token: string;
  expires_at: number; // Unix timestamp in ms
}

// Cache entry interface
export interface CacheEntry<T> {
  data: T;
  cached_at: string;
  expires_at: string;
}

// API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  cached?: boolean;
}

// Error response
export interface SpotifyErrorResponse {
  error: {
    status: number;
    message: string;
  };
}

// ============================================================================
// Database Types (matching Supabase schema)
// ============================================================================

/**
 * Spotify category stored in database
 */
export interface DbSpotifyCategory {
  id: string;
  name: string;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Spotify show stored in database
 */
export interface DbSpotifyShow {
  id: string;
  name: string;
  publisher: string | null;
  description: string | null;
  image_url: string | null;
  total_episodes: number;
  explicit: boolean;
  languages: string[];
  available_markets: string[];
  external_url: string;
  created_at: string;
  updated_at: string;
}

/**
 * Spotify episode stored in database
 */
export interface DbSpotifyEpisode {
  id: string;
  show_id: string;
  name: string;
  description: string | null;
  duration_ms: number;
  release_date: string;
  image_url: string | null;
  external_url: string;
  explicit: boolean;
  created_at: string;
}

/**
 * Generic API response cache entry
 */
export interface DbSpotifyCache {
  cache_key: string;
  data: unknown;
  expires_at: string;
  created_at: string;
}

/**
 * User preferences for personalization
 */
export interface DbUserPreferences {
  id: string;
  user_id: string;
  country: string;
  created_at: string;
  updated_at: string;
}

/**
 * Show-category relationship
 */
export interface DbSpotifyShowCategory {
  show_id: string;
  category_id: string;
  created_at: string;
}

// ============================================================================
// Extended Database Types with Relations
// ============================================================================

/**
 * Show with its categories
 */
export interface DbSpotifyShowWithCategories extends DbSpotifyShow {
  categories?: DbSpotifyCategory[];
}

/**
 * Show with its episodes
 */
export interface DbSpotifyShowWithEpisodes extends DbSpotifyShow {
  episodes?: DbSpotifyEpisode[];
}

/**
 * Category with its shows
 */
export interface DbSpotifyCategoryWithShows extends DbSpotifyCategory {
  shows?: DbSpotifyShow[];
}

/**
 * Episode with its parent show
 */
export interface DbSpotifyEpisodeWithShow extends DbSpotifyEpisode {
  show?: DbSpotifyShow;
}

// ============================================================================
// Input Types for Database Operations
// ============================================================================

/**
 * Input for creating/updating a category
 */
export interface SpotifyCategoryInput {
  id: string;
  name: string;
  icon_url?: string | null;
}

/**
 * Input for creating/updating a show
 */
export interface SpotifyShowInput {
  id: string;
  name: string;
  publisher?: string | null;
  description?: string | null;
  image_url?: string | null;
  total_episodes?: number;
  explicit?: boolean;
  languages?: string[];
  available_markets?: string[];
  external_url: string;
}

/**
 * Input for creating an episode
 */
export interface SpotifyEpisodeInput {
  id: string;
  show_id: string;
  name: string;
  description?: string | null;
  duration_ms?: number;
  release_date: string;
  image_url?: string | null;
  external_url: string;
  explicit?: boolean;
}

/**
 * Input for creating/updating a cache entry
 */
export interface SpotifyCacheInput {
  cache_key: string;
  data: unknown;
  expires_at: string;
}

/**
 * Input for creating/updating user preferences
 */
export interface UserPreferencesInput {
  user_id: string;
  country?: string;
}

// ============================================================================
// Query/Filter Types
// ============================================================================

/**
 * Filter options for querying shows
 */
export interface SpotifyShowFilters {
  market?: string;
  language?: string;
  categoryId?: string;
  explicit?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Filter options for querying episodes
 */
export interface SpotifyEpisodeFilters {
  showId?: string;
  explicit?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Cache Key Types
// ============================================================================

/**
 * Standard cache key patterns
 */
export type CacheKeyType =
  | `categories:${string}`                    // e.g., "categories:US"
  | `top_shows:${string}`                     // e.g., "top_shows:IL"
  | `category_shows:${string}:${string}`      // e.g., "category_shows:comedy:US"
  | `show:${string}`                          // e.g., "show:4rOoJ6Egrf8K2IrywzwOMk"
  | `show_episodes:${string}`;                // e.g., "show_episodes:4rOoJ6Egrf8K2IrywzwOMk"

/**
 * Helper to create cache keys
 */
export const CacheKeys = {
  categories: (market: string): CacheKeyType => `categories:${market}`,
  topShows: (market: string): CacheKeyType => `top_shows:${market}`,
  categoryShows: (categoryId: string, market: string): CacheKeyType =>
    `category_shows:${categoryId}:${market}`,
  show: (showId: string): CacheKeyType => `show:${showId}`,
  showEpisodes: (showId: string): CacheKeyType => `show_episodes:${showId}`,
} as const;

// ============================================================================
// Mapper Functions (API -> Database)
// ============================================================================

/**
 * Maps a Spotify API show response to database input format
 */
export function mapApiShowToDbInput(apiShow: SpotifyShow): SpotifyShowInput {
  return {
    id: apiShow.id,
    name: apiShow.name,
    publisher: apiShow.publisher,
    description: apiShow.description,
    image_url: apiShow.images?.[0]?.url ?? null,
    total_episodes: apiShow.total_episodes,
    explicit: apiShow.explicit,
    languages: apiShow.languages,
    available_markets: apiShow.available_markets ?? [],
    external_url: apiShow.external_urls.spotify,
  };
}

/**
 * Maps a Spotify API episode response to database input format
 */
export function mapApiEpisodeToDbInput(
  apiEpisode: SpotifyEpisode,
  showId: string
): SpotifyEpisodeInput {
  return {
    id: apiEpisode.id,
    show_id: showId,
    name: apiEpisode.name,
    description: apiEpisode.description,
    duration_ms: apiEpisode.duration_ms,
    release_date: apiEpisode.release_date,
    image_url: apiEpisode.images?.[0]?.url ?? null,
    external_url: apiEpisode.external_urls.spotify,
    explicit: apiEpisode.explicit,
  };
}

/**
 * Maps a Spotify API category response to database input format
 */
export function mapApiCategoryToDbInput(
  apiCategory: SpotifyCategory
): SpotifyCategoryInput {
  return {
    id: apiCategory.id,
    name: apiCategory.name,
    icon_url: apiCategory.icons?.[0]?.url ?? null,
  };
}

// ============================================================================
// Mapper Functions (Database -> API-like format for UI)
// ============================================================================

/**
 * Maps a database show to API-like format for UI consumption
 */
export function mapDbShowToApiFormat(dbShow: DbSpotifyShow): SpotifyShow {
  return {
    id: dbShow.id,
    name: dbShow.name,
    description: dbShow.description ?? "",
    html_description: dbShow.description ?? "",
    publisher: dbShow.publisher ?? "",
    images: dbShow.image_url ? [{ url: dbShow.image_url, height: null, width: null }] : [],
    languages: dbShow.languages,
    explicit: dbShow.explicit,
    total_episodes: dbShow.total_episodes,
    media_type: "audio",
    type: "show",
    uri: `spotify:show:${dbShow.id}`,
    href: `https://api.spotify.com/v1/shows/${dbShow.id}`,
    external_urls: { spotify: dbShow.external_url },
    available_markets: dbShow.available_markets,
  };
}

/**
 * Maps a database episode to API-like format for UI consumption
 */
export function mapDbEpisodeToApiFormat(dbEpisode: DbSpotifyEpisode): SpotifyEpisode {
  return {
    id: dbEpisode.id,
    name: dbEpisode.name,
    description: dbEpisode.description ?? "",
    html_description: dbEpisode.description ?? "",
    duration_ms: dbEpisode.duration_ms,
    release_date: dbEpisode.release_date,
    release_date_precision: "day",
    explicit: dbEpisode.explicit,
    images: dbEpisode.image_url ? [{ url: dbEpisode.image_url, height: null, width: null }] : [],
    languages: [],
    audio_preview_url: null,
    type: "episode",
    uri: `spotify:episode:${dbEpisode.id}`,
    href: `https://api.spotify.com/v1/episodes/${dbEpisode.id}`,
    external_urls: { spotify: dbEpisode.external_url },
  };
}

/**
 * Maps a database category to API-like format for UI consumption
 */
export function mapDbCategoryToApiFormat(dbCategory: DbSpotifyCategory): SpotifyCategory {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    icons: dbCategory.icon_url ? [{ url: dbCategory.icon_url, height: null, width: null }] : [],
    href: `https://api.spotify.com/v1/browse/categories/${dbCategory.id}`,
  };
}
