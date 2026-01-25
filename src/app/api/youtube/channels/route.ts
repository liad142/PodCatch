/**
 * GET /api/youtube/channels
 * Get all channels followed by user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFollowedChannels } from '@/lib/rsshub-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    const channels = await getFollowedChannels(userId);

    return NextResponse.json({
      success: true,
      channels,
      total: channels.length,
    });
  } catch (error) {
    console.error('Get channels error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get channels',
      },
      { status: 500 }
    );
  }
}
