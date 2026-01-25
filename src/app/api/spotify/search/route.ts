import { NextRequest, NextResponse } from "next/server";
import { searchShows } from "@/lib/spotify-api";
import { generateCacheKey, withCache } from "@/lib/spotify-cache";
import { SpotifySearchResponse } from "@/types/spotify";

/**
 * GET /api/spotify/search
 * Search for podcasts/shows
 *
 * Query parameters:
 * - q: Search query (required)
 * - market: Country code (default: US)
 * - limit: Number of results (default: 20, max: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const market = searchParams.get("market") || "US";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = generateCacheKey("search", {
      q: query.toLowerCase().trim(),
      market,
      limit,
      offset,
    });

    // Fetch with caching (shorter TTL for search results - 1 hour)
    const { data, cached } = await withCache<SpotifySearchResponse>(
      cacheKey,
      () => searchShows(query, market, limit, offset),
      1 // 1 hour cache for search results
    );

    // Transform response for client
    const shows = (data.shows?.items || []).map((show) => ({
      id: show.id,
      name: show.name,
      publisher: show.publisher,
      description: show.description,
      imageUrl: show.images[0]?.url || null,
      totalEpisodes: show.total_episodes,
      explicit: show.explicit,
      languages: show.languages,
      spotifyUrl: show.external_urls.spotify,
    }));

    return NextResponse.json({
      query,
      shows,
      total: data.shows?.total || 0,
      limit: data.shows?.limit || limit,
      offset: data.shows?.offset || offset,
      hasNext: data.shows?.next !== null,
      hasPrevious: data.shows?.previous !== null,
      market,
      cached,
    });
  } catch (error) {
    console.error("Search error:", error);

    return NextResponse.json(
      {
        error: "Search failed",
        message: "Unable to search podcasts. Please try again later.",
      },
      { status: 500 }
    );
  }
}
