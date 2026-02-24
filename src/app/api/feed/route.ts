/**
 * GET /api/feed
 * Get unified feed with filters
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
    const sourceType = searchParams.get('sourceType') as 'youtube' | 'podcast' | 'all' || 'all';
    const mode = searchParams.get('mode') as 'following' | 'latest' | 'mixed' || 'latest';
    const bookmarkedOnly = searchParams.get('bookmarked') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    console.log(`[FEED] user=${user.id.slice(0, 8)}… sourceType=${sourceType} mode=${mode} limit=${limit} offset=${offset}`);

    const items = await getFeed({
      userId: user.id,
      sourceType,
      mode,
      bookmarkedOnly,
      limit,
      offset,
    });

    console.log(`[FEED] Returned ${items.length} items (hasMore=${items.length === limit})`);

    return NextResponse.json({
      success: true,
      items,
      total: items.length,
      hasMore: items.length === limit,
    }, {
      headers: { 'Cache-Control': 'private, no-cache' },
    });
  } catch (error) {
    console.error('[FEED] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get feed',
      },
      { status: 500 }
    );
  }
}
