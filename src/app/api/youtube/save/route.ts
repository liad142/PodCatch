/**
 * POST /api/youtube/save
 * Save/unsave a YouTube video
 * Uses the feed_items table with bookmarked field
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      videoId, 
      title, 
      description, 
      thumbnailUrl, 
      publishedAt, 
      channelName, 
      url,
      action = 'toggle' // 'save', 'unsave', or 'toggle'
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing videoId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if item already exists
    const { data: existingItem, error: fetchError } = await supabase
      .from('feed_items')
      .select('id, bookmarked')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .eq('source_type', 'youtube')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      throw new Error(`Database error: ${fetchError.message}`);
    }

    let newBookmarkedState: boolean;
    let feedItemId: string;

    if (existingItem) {
      // Item exists, update bookmark status
      if (action === 'toggle') {
        newBookmarkedState = !existingItem.bookmarked;
      } else if (action === 'save') {
        newBookmarkedState = true;
      } else {
        newBookmarkedState = false;
      }

      const { error: updateError } = await supabase
        .from('feed_items')
        .update({ 
          bookmarked: newBookmarkedState,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id);

      if (updateError) {
        throw new Error(`Failed to update bookmark: ${updateError.message}`);
      }

      feedItemId = existingItem.id;
    } else {
      // Item doesn't exist, create it with bookmarked=true
      newBookmarkedState = action !== 'unsave';

      // We need to create a placeholder source_id for trending videos
      // Since they may not be from a followed channel
      const { data: newItem, error: insertError } = await supabase
        .from('feed_items')
        .insert({
          user_id: userId,
          source_type: 'youtube',
          source_id: '00000000-0000-0000-0000-000000000000', // Placeholder for non-followed sources
          video_id: videoId,
          title: title || 'YouTube Video',
          description: description || '',
          thumbnail_url: thumbnailUrl,
          published_at: publishedAt || new Date().toISOString(),
          url: url || `https://youtube.com/watch?v=${videoId}`,
          bookmarked: newBookmarkedState,
        })
        .select('id')
        .single();

      if (insertError) {
        // Handle unique constraint violation gracefully
        if (insertError.code === '23505') {
          // Item was created by another request, retry fetch
          const { data: refetchedItem } = await supabase
            .from('feed_items')
            .select('id, bookmarked')
            .eq('user_id', userId)
            .eq('video_id', videoId)
            .eq('source_type', 'youtube')
            .single();

          if (refetchedItem) {
            feedItemId = refetchedItem.id;
            newBookmarkedState = refetchedItem.bookmarked;
          } else {
            throw new Error('Failed to save video');
          }
        } else {
          throw new Error(`Failed to save video: ${insertError.message}`);
        }
      } else {
        feedItemId = newItem?.id || '';
      }
    }

    return NextResponse.json({
      success: true,
      bookmarked: newBookmarkedState,
      feedItemId,
      videoId,
    });
  } catch (error) {
    console.error('Save video error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to save video',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/youtube/save
 * Get all saved YouTube videos for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error, count } = await supabase
      .from('feed_items')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('source_type', 'youtube')
      .eq('bookmarked', true)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch saved videos: ${error.message}`);
    }

    // Transform to frontend format
    const videos = (data || []).map(item => ({
      id: item.id,
      videoId: item.video_id,
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnail_url,
      publishedAt: item.published_at,
      url: item.url,
      bookmarked: item.bookmarked,
      savedAt: item.updated_at,
    }));

    return NextResponse.json({
      success: true,
      videos,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('Get saved videos error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch saved videos',
      },
      { status: 500 }
    );
  }
}
