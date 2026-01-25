import { NextRequest, NextResponse } from "next/server";
import { getCategories } from "@/lib/spotify-api";
import { generateCacheKey, withCache } from "@/lib/spotify-cache";
import { SpotifyCategoriesResponse } from "@/types/spotify";

/**
 * GET /api/spotify/categories
 * Returns Spotify browse categories for a market
 *
 * Query parameters:
 * - market: Country code (default: US)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const market = searchParams.get("market") || "US";

    // Generate cache key
    const cacheKey = generateCacheKey("categories", { market });

    // Fetch with caching
    const { data, cached } = await withCache<SpotifyCategoriesResponse>(
      cacheKey,
      () => getCategories(market)
    );

    // Transform response for client
    const categories = data.categories.items.map((category) => ({
      id: category.id,
      name: category.name,
      iconUrl: category.icons[0]?.url || null,
    }));

    return NextResponse.json({
      categories,
      total: data.categories.total,
      market,
      cached,
    });
  } catch (error) {
    console.error("Categories fetch error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch categories",
        message: "Unable to retrieve podcast categories. Please try again later.",
      },
      { status: 500 }
    );
  }
}
