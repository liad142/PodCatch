import {
  SpotifyTokenResponse,
  CachedToken,
  SpotifyCategoriesResponse,
  SpotifyShow,
  SpotifySearchResponse,
  SpotifyEpisodesResponse,
  SpotifyErrorResponse,
} from "@/types/spotify";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// In-memory token cache
let cachedToken: CachedToken | null = null;

// Rate limiting state
let retryAfter: number = 0;

/**
 * Get Spotify access token using Client Credentials flow
 * Caches the token in memory until it expires
 */
export async function getSpotifyToken(): Promise<string> {
  // Check if we have a valid cached token (with 60s buffer)
  if (cachedToken && cachedToken.expires_at > Date.now() + 60000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Spotify token error:", errorText);
    throw new Error(`Failed to get Spotify token: ${response.status}`);
  }

  const data: SpotifyTokenResponse = await response.json();

  // Cache the token
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Clear the cached token (for testing or forced refresh)
 */
export function clearTokenCache(): void {
  cachedToken = null;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a request to the Spotify API with automatic token management and rate limiting
 */
async function spotifyRequest<T>(
  endpoint: string,
  options: {
    retries?: number;
    backoffMs?: number;
  } = {}
): Promise<T> {
  const { retries = 3, backoffMs = 1000 } = options;

  // Check if we're rate limited
  if (retryAfter > Date.now()) {
    const waitTime = retryAfter - Date.now();
    console.log(`Rate limited, waiting ${waitTime}ms`);
    await sleep(waitTime);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const token = await getSpotifyToken();

      const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 30;
        retryAfter = Date.now() + waitSeconds * 1000;

        console.warn(`Spotify rate limited, retry after ${waitSeconds}s`);

        if (attempt < retries - 1) {
          await sleep(waitSeconds * 1000);
          continue;
        }
        throw new Error(`Rate limited by Spotify API`);
      }

      // Handle 401 - token might be expired, clear cache and retry
      if (response.status === 401) {
        clearTokenCache();
        if (attempt < retries - 1) {
          await sleep(backoffMs * Math.pow(2, attempt));
          continue;
        }
      }

      if (!response.ok) {
        const errorData: SpotifyErrorResponse = await response.json().catch(() => ({
          error: { status: response.status, message: response.statusText },
        }));
        throw new Error(errorData.error?.message || `Spotify API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Spotify API attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < retries - 1) {
        await sleep(backoffMs * Math.pow(2, attempt));
      }
    }
  }

  throw lastError || new Error("Spotify API request failed");
}

/**
 * Get browse categories for a market
 */
export async function getCategories(
  market: string = "US",
  limit: number = 50
): Promise<SpotifyCategoriesResponse> {
  return spotifyRequest<SpotifyCategoriesResponse>(
    `/browse/categories?country=${encodeURIComponent(market)}&limit=${limit}&locale=en_${market}`
  );
}

/**
 * Search for shows
 */
export async function searchShows(
  query: string,
  market: string = "US",
  limit: number = 20,
  offset: number = 0
): Promise<SpotifySearchResponse> {
  return spotifyRequest<SpotifySearchResponse>(
    `/search?type=show&q=${encodeURIComponent(query)}&market=${encodeURIComponent(market)}&limit=${limit}&offset=${offset}`
  );
}

/**
 * Get a single show by ID
 */
export async function getShow(
  showId: string,
  market: string = "US"
): Promise<SpotifyShow> {
  return spotifyRequest<SpotifyShow>(
    `/shows/${encodeURIComponent(showId)}?market=${encodeURIComponent(market)}`
  );
}

/**
 * Get multiple shows by IDs
 */
export async function getShows(
  showIds: string[],
  market: string = "US"
): Promise<{ shows: SpotifyShow[] }> {
  const ids = showIds.slice(0, 50).join(","); // Spotify limits to 50
  return spotifyRequest<{ shows: SpotifyShow[] }>(
    `/shows?ids=${encodeURIComponent(ids)}&market=${encodeURIComponent(market)}`
  );
}

/**
 * Get episodes for a show
 */
export async function getShowEpisodes(
  showId: string,
  market: string = "US",
  limit: number = 20,
  offset: number = 0
): Promise<SpotifyEpisodesResponse> {
  return spotifyRequest<SpotifyEpisodesResponse>(
    `/shows/${encodeURIComponent(showId)}/episodes?market=${encodeURIComponent(market)}&limit=${limit}&offset=${offset}`
  );
}

/**
 * Get top/featured podcasts (uses search as Spotify doesn't have a direct endpoint)
 */
export async function getTopPodcasts(
  market: string = "US",
  limit: number = 20
): Promise<SpotifySearchResponse> {
  // Use a search query that typically returns popular podcasts
  return searchShows("top podcasts", market, limit, 0);
}

/**
 * Get shows for a category (searches using category name)
 */
export async function getShowsForCategory(
  categoryName: string,
  market: string = "US",
  limit: number = 20
): Promise<SpotifySearchResponse> {
  // Search for podcasts related to the category
  return searchShows(`${categoryName} podcast`, market, limit, 0);
}
