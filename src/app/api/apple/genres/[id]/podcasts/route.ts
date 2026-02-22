import { NextRequest, NextResponse } from 'next/server';
import { getPodcastsByGenre } from '@/lib/apple-podcasts';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: genreId } = await params;
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'us';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const podcasts = await getPodcastsByGenre(genreId, country, limit);

    return NextResponse.json({
      podcasts,
      genreId,
      country,
      count: podcasts.length,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (error) {
    console.error('Apple genre podcasts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch podcasts for genre' },
      { status: 500 }
    );
  }
}
