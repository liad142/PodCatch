/**
 * POST /api/youtube/channels/follow
 * Follow a YouTube channel by URL, channel ID, or handle
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchYouTubeChannelFeed,
  parseYouTubeInput,
  checkRateLimit,
} from '@/lib/rsshub';
import {
  upsertYouTubeChannel,
  followYouTubeChannel,
  upsertFeedItems,
} from '@/lib/rsshub-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, userId } = body;

    // Validate input
    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid input' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Rate limiting
    if (!(await checkRateLimit(userId, 10, 60))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      );
    }

    // Parse input
    const parsed = parseYouTubeInput(input.trim());
    if (parsed.type === 'unknown') {
      return NextResponse.json(
        { error: 'Invalid YouTube channel URL, ID, or handle' },
        { status: 400 }
      );
    }

    // Fetch channel feed from RSSHub
    const { channel, videos } = await fetchYouTubeChannelFeed(parsed.value);

    // Upsert channel to DB
    const dbChannel = await upsertYouTubeChannel({
      channelId: channel.channelId,
      channelName: channel.channelName,
      channelUrl: channel.channelUrl,
      channelHandle: channel.channelHandle,
      thumbnailUrl: channel.thumbnailUrl,
      description: channel.description,
    });

    // Follow the channel
    await followYouTubeChannel(userId, dbChannel.id);

    // Store feed items
    await upsertFeedItems(
      videos.map((video) => ({
        sourceType: 'youtube' as const,
        sourceId: dbChannel.id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        publishedAt: video.publishedAt,
        duration: video.duration,
        url: video.url,
        videoId: video.videoId,
        userId,
      }))
    );

    return NextResponse.json({
      success: true,
      channel: {
        id: dbChannel.id,
        channelId: dbChannel.channelId,
        channelName: dbChannel.channelName,
        channelUrl: dbChannel.channelUrl,
        thumbnailUrl: dbChannel.thumbnailUrl,
      },
      videosAdded: videos.length,
    });
  } catch (error) {
    console.error('Follow channel error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to follow channel',
      },
      { status: 500 }
    );
  }
}
