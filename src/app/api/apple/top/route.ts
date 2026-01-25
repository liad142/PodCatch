import { NextRequest, NextResponse } from 'next/server';
import { getTopPodcasts } from '@/lib/apple-podcasts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'us';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const genreId = searchParams.get('genre') || undefined;

    const podcasts = await getTopPodcasts(country, limit, genreId);

    return NextResponse.json({
      podcasts,
      country,
      genreId,
      count: podcasts.length,
    });
  } catch (error) {
    console.error('Apple top podcasts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch top podcasts' },
      { status: 500 }
    );
  }
}
