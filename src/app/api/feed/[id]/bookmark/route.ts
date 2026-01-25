/**
 * POST /api/feed/[id]/bookmark
 * Toggle bookmark on a feed item
 */

import { NextRequest, NextResponse } from 'next/server';
import { toggleBookmark } from '@/lib/rsshub-db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    const bookmarked = await toggleBookmark(userId, id);

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
