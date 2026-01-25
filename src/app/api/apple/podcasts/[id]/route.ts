import { NextRequest, NextResponse } from 'next/server';
import { getPodcastById } from '@/lib/apple-podcasts';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: podcastId } = await params;
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'us';

    const podcast = await getPodcastById(podcastId, country);

    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ podcast });
  } catch (error) {
    console.error('Apple podcast lookup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch podcast' },
      { status: 500 }
    );
  }
}
