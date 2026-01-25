import { NextRequest, NextResponse } from "next/server";
import { getShowsForCategory, getCategories } from "@/lib/spotify-api";
import { generateCacheKey, withCache } from "@/lib/spotify-cache";
import { SpotifySearchResponse, SpotifyCategoriesResponse } from "@/types/spotify";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/spotify/categories/[id]/shows
 * Returns top shows for a category
 *
 * Note: Spotify doesn't have a direct category->shows endpoint.
 * We search for podcasts using the category name as a query.
 *
 * Query parameters:
 * - market: Country code (default: US)
 * - limit: Number of results (default: 20, max: 50)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: categoryId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const market = searchParams.get("market") || "US";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // First, get the category name
    const categoriesCacheKey = generateCacheKey("categories", { market });
    const { data: categoriesData } = await withCache<SpotifyCategoriesResponse>(
      categoriesCacheKey,
      () => getCategories(market)
    );

    const category = categoriesData.categories.items.find(
      (cat) => cat.id === categoryId
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Search for shows using the category name
    const showsCacheKey = generateCacheKey("category_shows", {
      categoryId,
      market,
      limit,
    });

    const { data, cached } = await withCache<SpotifySearchResponse>(
      showsCacheKey,
      () => getShowsForCategory(category.name, market, limit)
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
      spotifyUrl: show.external_urls.spotify,
    }));

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
      },
      shows,
      total: data.shows?.total || 0,
      market,
      cached,
    });
  } catch (error) {
    console.error("Category shows fetch error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch shows for category",
        message: "Unable to retrieve shows. Please try again later.",
      },
      { status: 500 }
    );
  }
}
