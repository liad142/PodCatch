import { NextRequest, NextResponse } from 'next/server';
import { searchPodcasts } from '@/lib/apple-podcasts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('q') || searchParams.get('term');
    const country = searchParams.get('country') || 'us';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!term) {
      return NextResponse.json(
        { error: 'Search term is required (use ?q=term or ?term=term)' },
        { status: 400 }
      );
    }

    const podcasts = await searchPodcasts(term, country, limit);

    return NextResponse.json({
      podcasts,
      query: term,
      country,
      count: podcasts.length,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
    });
  } catch (error) {
    console.error('Apple search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search podcasts' },
      { status: 500 }
    );
  }
}
