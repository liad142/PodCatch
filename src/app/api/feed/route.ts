/**
 * GET /api/feed
 * Get unified feed with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeed } from '@/lib/rsshub-db';

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

    const sourceType = searchParams.get('sourceType') as 'youtube' | 'podcast' | 'all' || 'all';
    const mode = searchParams.get('mode') as 'following' | 'latest' | 'mixed' || 'latest';
    const bookmarkedOnly = searchParams.get('bookmarked') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const items = await getFeed({
      userId,
      sourceType,
      mode,
      bookmarkedOnly,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      items,
      total: items.length,
      hasMore: items.length === limit,
    });
  } catch (error) {
    console.error('Get feed error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get feed',
      },
      { status: 500 }
    );
  }
}
