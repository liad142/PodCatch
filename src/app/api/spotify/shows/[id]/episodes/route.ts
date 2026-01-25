import { NextRequest, NextResponse } from "next/server";
import { getShowEpisodes } from "@/lib/spotify-api";
import { generateCacheKey, withCache } from "@/lib/spotify-cache";
import { SpotifyEpisodesResponse } from "@/types/spotify";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/spotify/shows/[id]/episodes
 * Returns episodes for a specific show
 *
 * Query parameters:
 * - market: Country code (default: US)
 * - limit: Number of results (default: 20, max: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: showId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const market = searchParams.get("market") || "US";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    if (!showId) {
      return NextResponse.json(
        { error: "Show ID is required" },
        { status: 400 }
      );
    }

    // Generate cache key (include offset for pagination)
    const cacheKey = generateCacheKey("show_episodes", {
      id: showId,
      market,
      limit,
      offset,
    });

    // Fetch with caching
    const { data, cached } = await withCache<SpotifyEpisodesResponse>(
      cacheKey,
      () => getShowEpisodes(showId, market, limit, offset)
    );

    // Transform response for client
    const episodes = data.items.map((episode) => ({
      id: episode.id,
      name: episode.name,
      description: episode.description,
      htmlDescription: episode.html_description,
      durationMs: episode.duration_ms,
      durationFormatted: formatDuration(episode.duration_ms),
      releaseDate: episode.release_date,
      releaseDatePrecision: episode.release_date_precision,
      imageUrl: episode.images[0]?.url || null,
      audioPreviewUrl: episode.audio_preview_url,
      explicit: episode.explicit,
      spotifyUrl: episode.external_urls.spotify,
      uri: episode.uri,
      isPlayable: episode.is_playable,
    }));

    return NextResponse.json({
      showId,
      episodes,
      total: data.total,
      limit: data.limit,
      offset: data.offset,
      hasNext: data.next !== null,
      hasPrevious: data.previous !== null,
      market,
      cached,
    });
  } catch (error) {
    console.error("Episodes fetch error:", error);

    // Check if it's a "not found" error
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json(
        {
          error: "Show not found",
          message: "The requested podcast could not be found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch episodes",
        message: "Unable to retrieve episodes. Please try again later.",
      },
      { status: 500 }
    );
  }
}

/**
 * Format duration from milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
