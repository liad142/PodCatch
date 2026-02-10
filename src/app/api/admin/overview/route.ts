import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OverviewStats } from '@/types/admin';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalPodcasts },
    { count: totalEpisodes },
    { data: summaryStatuses },
    { data: transcriptStatuses },
    { count: totalSubscriptions },
    { count: totalFollows },
    { data: signups },
    { data: recentSummaries },
  ] = await Promise.all([
    admin.from('user_profiles').select('*', { count: 'exact', head: true }),
    admin.from('podcasts').select('*', { count: 'exact', head: true }),
    admin.from('episodes').select('*', { count: 'exact', head: true }),
    admin.from('summaries').select('status, level'),
    admin.from('transcripts').select('status'),
    admin.from('podcast_subscriptions').select('*', { count: 'exact', head: true }),
    admin.from('youtube_channel_follows').select('*', { count: 'exact', head: true }),
    admin.from('user_profiles').select('created_at').order('created_at', { ascending: true }),
    admin.from('summaries').select('status, level, updated_at, episode_id').order('updated_at', { ascending: false }).limit(10),
  ]);

  // Count summary statuses
  const statusCounts: Record<string, number> = {};
  (summaryStatuses ?? []).forEach((s: { status: string }) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  const summariesReady = statusCounts['ready'] || 0;
  const summariesFailed = statusCounts['failed'] || 0;
  const totalSummaries = (summaryStatuses ?? []).length;
  const queueDepth = (statusCounts['queued'] || 0) + (statusCounts['transcribing'] || 0) + (statusCounts['summarizing'] || 0);
  const failureRate = totalSummaries > 0 ? Math.round((summariesFailed / totalSummaries) * 100) : 0;

  // AI status breakdown
  const aiStatusBreakdown = Object.entries(statusCounts).map(([label, count]) => ({ label, count }));

  // Signups over time (group by day)
  const signupsByDay: Record<string, number> = {};
  (signups ?? []).forEach((u: { created_at: string }) => {
    const day = u.created_at.split('T')[0];
    signupsByDay[day] = (signupsByDay[day] || 0) + 1;
  });
  const signupsOverTime = Object.entries(signupsByDay).map(([date, value]) => ({ date, value }));

  // Recent activity
  const recentActivity = (recentSummaries ?? []).map((s: { episode_id: string; status: string; level: string; updated_at: string }) => ({
    type: `${s.level} summary`,
    description: `Episode ${s.episode_id.slice(0, 8)}... → ${s.status}`,
    timestamp: s.updated_at,
  }));

  const data: OverviewStats = {
    totalUsers: totalUsers ?? 0,
    totalPodcasts: totalPodcasts ?? 0,
    totalEpisodes: totalEpisodes ?? 0,
    summariesReady,
    queueDepth,
    failureRate,
    totalSubscriptions: totalSubscriptions ?? 0,
    totalFollows: totalFollows ?? 0,
    signupsOverTime,
    aiStatusBreakdown,
    recentActivity,
  };

  return NextResponse.json(data);
}
