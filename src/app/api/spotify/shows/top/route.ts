import { NextRequest, NextResponse } from "next/server";
import { getTopPodcasts } from "@/lib/spotify-api";
import { generateCacheKey, withCache } from "@/lib/spotify-cache";
import { SpotifySearchResponse } from "@/types/spotify";

/**
 * GET /api/spotify/shows/top
 * Returns top/featured podcasts for a market
 *
 * Query parameters:
 * - market: Country code (default: US)
 * - limit: Number of results (default: 20, max: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const market = searchParams.get("market") || "US";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    // Generate cache key
    const cacheKey = generateCacheKey("top_shows", { market, limit });

    // Fetch with caching
    const { data, cached } = await withCache<SpotifySearchResponse>(
      cacheKey,
      () => getTopPodcasts(market, limit)
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
      shows,
      total: data.shows?.total || 0,
      market,
      cached,
    });
  } catch (error) {
    console.error("Top shows fetch error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch top shows",
        message: "Unable to retrieve top podcasts. Please try again later.",
      },
      { status: 500 }
    );
  }
}
