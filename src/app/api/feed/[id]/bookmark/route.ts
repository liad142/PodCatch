/**
 * POST /api/feed/[id]/bookmark
 * Set or toggle bookmark on a feed item.
 * Pass { bookmarked: true/false } for atomic set (preferred).
 * Pass {} without bookmarked for legacy toggle behavior.
 */

import { NextRequest, NextResponse } from 'next/server';
import { setBookmark, toggleBookmark } from '@/lib/rsshub-db';
import { getAuthUser } from '@/lib/auth-helpers';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { bookmarked: desiredState } = body;

    // Use atomic setBookmark when the desired state is provided, otherwise fall back to toggle
    const bookmarked = typeof desiredState === 'boolean'
      ? await setBookmark(user.id, id, desiredState)
      : await toggleBookmark(user.id, id);

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
