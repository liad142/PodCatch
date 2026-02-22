import { NextResponse } from 'next/server';
import { getGenres } from '@/lib/apple-podcasts';

let cachedGenres: { data: any; timestamp: number } | null = null;
const GENRE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  try {
    // Return cached data if still fresh
    if (cachedGenres && Date.now() - cachedGenres.timestamp < GENRE_CACHE_TTL) {
      return NextResponse.json(cachedGenres.data, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' },
      });
    }

    const genres = getGenres();

    const responseData = {
      genres,
      count: genres.length,
    };

    // Cache the response
    cachedGenres = {
      data: responseData,
      timestamp: Date.now(),
    };

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' },
    });
  } catch (error) {
    console.error('Apple genres error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch genres' },
      { status: 500 }
    );
  }
}
