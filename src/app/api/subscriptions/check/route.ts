import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST: Check subscription status for multiple podcasts
export async function POST(request: NextRequest) {
  try {
    const { userId, podcastIds, appleIds } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const statusMap: Record<string, boolean> = {};

    // Check by internal podcast IDs
    if (podcastIds && Array.isArray(podcastIds) && podcastIds.length > 0) {
      const { data: subscriptions } = await createServerClient()
        .from('podcast_subscriptions')
        .select('podcast_id')
        .eq('user_id', userId)
        .in('podcast_id', podcastIds);

      const subscribedIds = new Set((subscriptions || []).map(s => s.podcast_id));
      podcastIds.forEach((id: string) => {
        statusMap[id] = subscribedIds.has(id);
      });
    }

    // Check by Apple podcast IDs
    if (appleIds && Array.isArray(appleIds) && appleIds.length > 0) {
      const appleRssUrls = appleIds.map((id: string) => `apple:${id}`);

      // First, find podcasts by their apple RSS URLs
      const { data: podcasts } = await createServerClient()
        .from('podcasts')
        .select('id, rss_feed_url')
        .in('rss_feed_url', appleRssUrls);

      if (podcasts && podcasts.length > 0) {
        const podcastIdList = podcasts.map(p => p.id);

        // Then check subscriptions for these podcasts
        const { data: subscriptions } = await createServerClient()
          .from('podcast_subscriptions')
          .select('podcast_id')
          .eq('user_id', userId)
          .in('podcast_id', podcastIdList);

        const subscribedPodcastIds = new Set((subscriptions || []).map(s => s.podcast_id));

        // Map back to apple IDs
        podcasts.forEach(podcast => {
          const appleId = podcast.rss_feed_url.replace('apple:', '');
          statusMap[appleId] = subscribedPodcastIds.has(podcast.id);
        });
      }

      // Mark any apple IDs not found as not subscribed
      appleIds.forEach((id: string) => {
        if (!(id in statusMap)) {
          statusMap[id] = false;
        }
      });
    }

    return NextResponse.json({ subscriptions: statusMap });
  } catch (error) {
    console.error('Error checking subscriptions:', error);
    return NextResponse.json({ error: 'Failed to check subscriptions' }, { status: 500 });
  }
}
