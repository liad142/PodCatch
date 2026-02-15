import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminNotificationData, NotificationWithEpisode } from '@/types/notifications';
import type { TimeSeriesPoint, LabeledCount } from '@/types/admin';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: allNotifications },
    { data: telegramConnections },
    { data: pendingNotifications },
    { data: recentSends },
  ] = await Promise.all([
    admin
      .from('notification_requests')
      .select('id, status, channel, scheduled, created_at, sent_at')
      .gte('created_at', thirtyDaysAgo)
      .limit(5000),
    admin
      .from('telegram_connections')
      .select('id'),
    admin
      .from('notification_requests')
      .select('id, user_id, episode_id, channel, recipient, status, scheduled, error_message, created_at, sent_at, updated_at, episodes(title, podcast_id, podcasts(title, image_url))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('notification_requests')
      .select('id, user_id, episode_id, channel, recipient, status, scheduled, error_message, created_at, sent_at, updated_at, episodes(title, podcast_id, podcasts(title, image_url))')
      .in('status', ['sent', 'failed'])
      .order('updated_at', { ascending: false })
      .limit(50),
  ]);

  const notifications = allNotifications ?? [];

  // Metrics
  const totalSent = notifications.filter(n => n.status === 'sent').length;
  const sentToday = notifications.filter(n => n.status === 'sent' && n.sent_at && n.sent_at >= todayStart).length;
  const pending = notifications.filter(n => n.status === 'pending').length;
  const failedCount = notifications.filter(n => n.status === 'failed').length;
  const completedCount = totalSent + failedCount;
  const failureRate = completedCount > 0 ? Math.round((failedCount / completedCount) * 100) : 0;
  const activeTelegramConnections = telegramConnections?.length ?? 0;

  // Notifications over time (last 30 days, daily counts of sent)
  const byDay: Record<string, number> = {};
  notifications.forEach(n => {
    if (n.status === 'sent' && n.sent_at) {
      const day = n.sent_at.split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    }
  });
  const notificationsOverTime: TimeSeriesPoint[] = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // By channel
  const channelCounts: Record<string, number> = {};
  notifications.forEach(n => {
    channelCounts[n.channel] = (channelCounts[n.channel] || 0) + 1;
  });
  const byChannel: LabeledCount[] = Object.entries(channelCounts).map(([label, count]) => ({ label, count }));

  // Scheduled vs instant
  const scheduledCount = notifications.filter(n => n.scheduled).length;
  const instantCount = notifications.filter(n => !n.scheduled).length;
  const scheduledVsInstant: LabeledCount[] = [
    { label: 'Scheduled', count: scheduledCount },
    { label: 'Instant', count: instantCount },
  ];

  // Map joined episode data to NotificationWithEpisode
  function mapWithEpisode(row: Record<string, unknown>): NotificationWithEpisode {
    const episodes = row.episodes as Record<string, unknown> | null;
    const podcasts = episodes?.podcasts as Record<string, unknown> | null;
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      episode_id: row.episode_id as string,
      channel: row.channel as NotificationWithEpisode['channel'],
      recipient: row.recipient as string,
      status: row.status as NotificationWithEpisode['status'],
      scheduled: row.scheduled as boolean,
      error_message: (row.error_message as string) || null,
      created_at: row.created_at as string,
      sent_at: (row.sent_at as string) || null,
      updated_at: row.updated_at as string,
      episode_title: (episodes?.title as string) || 'Unknown',
      podcast_name: (podcasts?.title as string) || 'Unknown',
      podcast_image_url: (podcasts?.image_url as string) || null,
    };
  }

  const pendingList = (pendingNotifications ?? []).map(r => mapWithEpisode(r as unknown as Record<string, unknown>));
  const recentSendsList = (recentSends ?? []).map(r => mapWithEpisode(r as unknown as Record<string, unknown>));

  const data: AdminNotificationData = {
    metrics: {
      totalSent,
      sentToday,
      pending,
      failureRate,
      activeTelegramConnections,
    },
    notificationsOverTime,
    byChannel,
    scheduledVsInstant,
    pendingList,
    recentSends: recentSendsList,
  };

  return NextResponse.json(data);
}
