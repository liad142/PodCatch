/**
 * DELETE /api/youtube/channels/[id]/unfollow
 * Unfollow a YouTube channel
 */

import { NextRequest, NextResponse } from 'next/server';
import { unfollowYouTubeChannel } from '@/lib/rsshub-db';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Unfollow the channel
    await unfollowYouTubeChannel(userId, id);

    return NextResponse.json({
      success: true,
      message: 'Channel unfollowed',
    });
  } catch (error) {
    console.error('Unfollow channel error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to unfollow channel',
      },
      { status: 500 }
    );
  }
}
