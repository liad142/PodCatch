import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCached, setCached, CacheTTL } from '@/lib/cache';
import type { EngagementAnalytics } from '@/types/admin';

const CACHE_KEY = 'admin:engagement-analytics';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  // Check Redis cache first (15 min TTL)
  const cached = await getCached<EngagementAnalytics>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached);
  }

  const admin = createAdminClient();

  const [
    { data: subscriptions, count: totalSubscriptions },
    { data: follows, count: totalFollows },
    { count: totalBookmarks },
    { data: feedItems },
  ] = await Promise.all([
    admin.from('podcast_subscriptions').select('created_at, podcast_id, podcasts(id, title, image_url)', { count: 'exact' }).limit(1000),
    admin.from('youtube_channel_follows').select('created_at, channel_id, youtube_channels(id, channel_name)', { count: 'exact' }).limit(1000),
    admin.from('feed_items').select('*', { count: 'exact', head: true }).eq('bookmarked', true),
    admin.from('feed_items').select('source_type').limit(5000),
  ]);

  // Subscriptions over time
  const subsByDay: Record<string, number> = {};
  (subscriptions ?? []).forEach(s => {
    const day = s.created_at.split('T')[0];
    subsByDay[day] = (subsByDay[day] || 0) + 1;
  });
  const subscriptionsOverTime = Object.entries(subsByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // Follows over time
  const followsByDay: Record<string, number> = {};
  (follows ?? []).forEach(f => {
    const day = f.created_at.split('T')[0];
    followsByDay[day] = (followsByDay[day] || 0) + 1;
  });
  const followsOverTime = Object.entries(followsByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // Top subscribed podcasts
  const subCounts: Record<string, { title: string; image_url: string | null; count: number }> = {};
  (subscriptions ?? []).forEach((s: { podcast_id: string; podcasts: { id: string; title: string; image_url: string | null } | { id: string; title: string; image_url: string | null }[] | null }) => {
    const podcast = Array.isArray(s.podcasts) ? s.podcasts[0] : s.podcasts;
    if (podcast) {
      if (!subCounts[s.podcast_id]) {
        subCounts[s.podcast_id] = { title: podcast.title, image_url: podcast.image_url, count: 0 };
      }
      subCounts[s.podcast_id].count++;
    }
  });
  const topSubscribed = Object.entries(subCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([id, { title, image_url, count }]) => ({ id, title, subscriber_count: count, image_url }));

  // Top followed channels
  const followCounts: Record<string, { title: string; count: number }> = {};
  (follows ?? []).forEach((f: { channel_id: string; youtube_channels: { id: string; channel_name: string } | { id: string; channel_name: string }[] | null }) => {
    const channel = Array.isArray(f.youtube_channels) ? f.youtube_channels[0] : f.youtube_channels;
    if (channel) {
      if (!followCounts[f.channel_id]) {
        followCounts[f.channel_id] = { title: channel.channel_name, count: 0 };
      }
      followCounts[f.channel_id].count++;
    }
  });
  const topFollowed = Object.entries(followCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([id, { title, count }]) => ({ id, title, follower_count: count }));

  // Feed items by source type
  const sourceCounts: Record<string, number> = {};
  (feedItems ?? []).forEach((f: { source_type: string }) => {
    sourceCounts[f.source_type] = (sourceCounts[f.source_type] || 0) + 1;
  });
  const feedItemsBySource = Object.entries(sourceCounts).map(([label, count]) => ({ label, count }));

  const data: EngagementAnalytics = {
    totalSubscriptions: totalSubscriptions ?? 0,
    totalFollows: totalFollows ?? 0,
    totalBookmarks: totalBookmarks ?? 0,
    subscriptionsOverTime,
    followsOverTime,
    topSubscribed,
    topFollowed,
    feedItemsBySource,
  };

  // Cache for 15 minutes
  await setCached(CACHE_KEY, data, CacheTTL.ANALYTICS);

  return NextResponse.json(data);
}
