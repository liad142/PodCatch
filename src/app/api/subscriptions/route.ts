import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth-helpers';

// GET: List all subscribed podcasts for a user
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  try {
    const { data: subscriptions, error, count } = await createAdminClient()
      .from('podcast_subscriptions')
      .select(`
        id,
        created_at,
        last_viewed_at,
        podcasts (
          id,
          title,
          author,
          description,
          rss_feed_url,
          image_url,
          language,
          created_at,
          latest_episode_date
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const podcastsWithStatus = (subscriptions || []).map((sub: any) => {
      const podcast = sub.podcasts;
      const hasNewEpisodes = podcast.latest_episode_date && sub.last_viewed_at
        ? new Date(podcast.latest_episode_date) > new Date(sub.last_viewed_at)
        : false;

      return {
        ...podcast,
        subscription: {
          id: sub.id,
          created_at: sub.created_at,
          last_viewed_at: sub.last_viewed_at,
        },
        has_new_episodes: hasNewEpisodes,
      };
    });

    return NextResponse.json({
      podcasts: podcastsWithStatus,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

// POST: Subscribe to a podcast
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { podcastId } = await request.json();

    if (!podcastId) {
      return NextResponse.json(
        { error: 'podcastId is required' },
        { status: 400 }
      );
    }

    const { data: existing } = await createAdminClient()
      .from('podcast_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('podcast_id', podcastId)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Already subscribed', id: existing.id });
    }

    const { data: subscription, error } = await createAdminClient()
      .from('podcast_subscriptions')
      .insert({
        user_id: user.id,
        podcast_id: podcastId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
