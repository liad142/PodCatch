import { NextRequest, NextResponse } from 'next/server';
import { getEpisodesByFeedId } from '@/lib/podcast-index';
import { checkRateLimit } from '@/lib/cache';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const allowed = await checkRateLimit(`pi:${ip}`, 30, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const allEpisodes = await getEpisodesByFeedId(id);

    const sliced = allEpisodes.slice(offset, offset + limit);

    return NextResponse.json({
      episodes: sliced.map((ep) => ({
        ...ep,
        publishedAt: ep.publishedAt instanceof Date ? ep.publishedAt.toISOString() : ep.publishedAt,
      })),
      totalCount: allEpisodes.length,
      hasMore: offset + limit < allEpisodes.length,
    });
  } catch (error) {
    console.error('PI episodes fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
}
