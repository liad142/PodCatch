/**
 * DELETE /api/youtube/channels/[id]/unfollow
 * Unfollow a YouTube channel
 */

import { NextRequest, NextResponse } from 'next/server';
import { unfollowYouTubeChannel } from '@/lib/rsshub-db';
import { getAuthUser } from '@/lib/auth-helpers';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    // Unfollow the channel
    await unfollowYouTubeChannel(user.id, id);

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
