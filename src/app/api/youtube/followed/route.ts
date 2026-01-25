/**
 * GET /api/youtube/followed
 * Get videos from followed YouTube channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeed } from '@/lib/rsshub-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Get feed items from followed channels
    const items = await getFeed({
      userId,
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
      channelName: '', // Could be enriched by joining with youtube_channels
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
