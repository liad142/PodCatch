import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { importYouTubeVideo } from '@/lib/youtube/video-import';
import { requestYouTubeSummary } from '@/lib/youtube/summary';
import type { SummaryLevel } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { videoId } = await params;
  const body = await request.json();
  const {
    level = 'quick',
    title,
    description,
    channelId,
    channelTitle,
    thumbnailUrl,
    publishedAt,
  } = body;

  if (!title || !channelId || !channelTitle) {
    return NextResponse.json(
      { error: 'Missing required fields: title, channelId, channelTitle' },
      { status: 400 }
    );
  }

  try {
    // Import video as episode
    const { episodeId, podcastId, isNew } = await importYouTubeVideo({
      videoId,
      title,
      description,
      channelId,
      channelTitle,
      thumbnailUrl,
      publishedAt,
    });

    // Request summary
    const result = await requestYouTubeSummary(
      episodeId,
      videoId,
      level as SummaryLevel
    );

    return NextResponse.json({
      episodeId,
      podcastId,
      isNew,
      summary: result,
    });
  } catch (err) {
    console.error(`[YT_SUMMARY] Error for video ${videoId}:`, err);
    return NextResponse.json(
      { error: 'Failed to process video summary' },
      { status: 500 }
    );
  }
}
