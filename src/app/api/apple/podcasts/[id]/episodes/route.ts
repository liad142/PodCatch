import { NextRequest, NextResponse } from 'next/server';
import { getPodcastEpisodes, getPodcastById } from '@/lib/apple-podcasts';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: podcastId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const country = searchParams.get('country') || 'us';

    // First get the podcast to get the feed URL
    const podcast = await getPodcastById(podcastId, country);

    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }

    const { episodes, totalCount, hasMore } = await getPodcastEpisodes(podcastId, podcast.feedUrl, limit, offset);

    return NextResponse.json({
      episodes,
      podcastId,
      totalCount,
      hasMore,
      count: episodes.length,
    });
  } catch (error) {
    console.error('Apple podcast episodes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
}
