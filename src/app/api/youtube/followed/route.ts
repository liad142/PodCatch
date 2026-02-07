/**
 * GET /api/youtube/followed
 * Get videos from followed YouTube channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeed } from '@/lib/rsshub-db';
import { getAuthUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get feed items from followed channels
    const items = await getFeed({
      userId: user.id,
      sourceType: 'youtube',
      mode: 'following',
      limit,
      offset,
    });

    // Transform to frontend format
    const videos = items.map(item => ({
      videoId: item.videoId || '',
      title: item.title,
      description: item.description || '',
      thumbnailUrl: item.thumbnailUrl || `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
      publishedAt: item.publishedAt,
      url: item.url,
      channelName: '',
      channelUrl: '',
      bookmarked: item.bookmarked,
      feedItemId: item.id,
    }));

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
      hasMore: videos.length === limit,
    });
  } catch (error) {
    console.error('Get followed videos error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch followed videos',
        videos: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
