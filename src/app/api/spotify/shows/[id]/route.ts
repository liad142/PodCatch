import { NextRequest, NextResponse } from "next/server";
import { getShow } from "@/lib/spotify-api";
import { generateCacheKey, withCache } from "@/lib/spotify-cache";
import { SpotifyShow } from "@/types/spotify";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/spotify/shows/[id]
 * Returns details for a specific show
 *
 * Query parameters:
 * - market: Country code (default: US)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: showId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const market = searchParams.get("market") || "US";

    if (!showId) {
      return NextResponse.json(
        { error: "Show ID is required" },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = generateCacheKey("show", { id: showId, market });

    // Fetch with caching
    const { data, cached } = await withCache<SpotifyShow>(cacheKey, () =>
      getShow(showId, market)
    );

    // Transform response for client
    const show = {
      id: data.id,
      name: data.name,
      publisher: data.publisher,
      description: data.description,
      htmlDescription: data.html_description,
      imageUrl: data.images[0]?.url || null,
      images: data.images.map((img) => ({
        url: img.url,
        width: img.width,
        height: img.height,
      })),
      totalEpisodes: data.total_episodes,
      explicit: data.explicit,
      languages: data.languages,
      mediaType: data.media_type,
      spotifyUrl: data.external_urls.spotify,
      uri: data.uri,
    };

    return NextResponse.json({
      show,
      market,
      cached,
    });
  } catch (error) {
    console.error("Show fetch error:", error);

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
        error: "Failed to fetch show",
        message: "Unable to retrieve podcast details. Please try again later.",
      },
      { status: 500 }
    );
  }
}
