/**
 * POST /api/feed/[id]/bookmark
 * Set or toggle bookmark on a feed item.
 * Pass { userId, bookmarked: true/false } for atomic set (preferred).
 * Pass { userId } without bookmarked for legacy toggle behavior.
 */

import { NextRequest, NextResponse } from 'next/server';
import { setBookmark, toggleBookmark } from '@/lib/rsshub-db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { userId, bookmarked: desiredState } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Use atomic setBookmark when the desired state is provided, otherwise fall back to toggle
    const bookmarked = typeof desiredState === 'boolean'
      ? await setBookmark(userId, id, desiredState)
      : await toggleBookmark(userId, id);

    return NextResponse.json({
      success: true,
      bookmarked,
    });
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to toggle bookmark',
      },
      { status: 500 }
    );
  }
}
