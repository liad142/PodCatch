import { NextRequest, NextResponse } from 'next/server';
import { getPodcastByFeedId } from '@/lib/podcast-index';
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

    const podcast = await getPodcastByFeedId(id);
    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    // Map to the same shape the browse page expects
    return NextResponse.json({
      podcast: {
        id: podcast.id,
        name: podcast.title,
        artistName: podcast.author,
        description: podcast.description,
        artworkUrl: podcast.artworkUrl,
        feedUrl: podcast.feedUrl,
        genres: podcast.genres,
        trackCount: podcast.episodeCount,
      },
    });
  } catch (error) {
    console.error('PI podcast fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch podcast' },
      { status: 500 }
    );
  }
}
