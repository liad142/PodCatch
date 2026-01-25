import { NextResponse } from "next/server";
import { getSpotifyToken, clearTokenCache } from "@/lib/spotify-api";

/**
 * Internal endpoint to refresh/get Spotify access token
 * This is primarily for internal use and testing
 */
export async function POST() {
  try {
    // Clear the cache to force a new token
    clearTokenCache();

    const token = await getSpotifyToken();

    // Don't expose the full token, just confirm it works
    return NextResponse.json({
      success: true,
      tokenPreview: `${token.substring(0, 10)}...`,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("Token refresh error:", error);

    return NextResponse.json(
      {
        error: "Failed to refresh token",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check token status
 */
export async function GET() {
  try {
    const token = await getSpotifyToken();

    return NextResponse.json({
      success: true,
      hasToken: !!token,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("Token check error:", error);

    return NextResponse.json(
      {
        error: "Token check failed",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
