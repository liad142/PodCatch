import { NextRequest, NextResponse } from 'next/server';
import { getPodcastEpisodes } from '@/lib/apple-podcasts';

interface PodcastEpisodesRequest {
  podcastId: string;
  limit: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { podcasts, country = 'us' } = body as {
      podcasts: PodcastEpisodesRequest[];
      country?: string;
    };

    if (!podcasts || !Array.isArray(podcasts) || podcasts.length === 0) {
      return NextResponse.json(
        { error: 'podcasts array is required' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (podcasts.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 podcasts per batch' },
        { status: 400 }
      );
    }

    // Fetch episodes for all podcasts in parallel
    const episodesPromises = podcasts.map(async ({ podcastId, limit }) => {
      try {
        const episodes = await getPodcastEpisodes(podcastId, undefined, limit);
        return {
          podcastId,
          episodes,
          success: true,
        };
      } catch (error) {
        console.error(`Error fetching episodes for podcast ${podcastId}:`, error);
        return {
          podcastId,
          episodes: [],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const results = await Promise.all(episodesPromises);

    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Batch episodes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
}
