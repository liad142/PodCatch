import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AiAnalytics } from '@/types/admin';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();

  const [
    { data: summaries },
    { data: transcripts },
    { data: recentFailedSummaries },
    { data: recentFailedTranscripts },
  ] = await Promise.all([
    admin.from('summaries').select('level, status, updated_at, episode_id').limit(5000),
    admin.from('transcripts').select('status, updated_at').limit(5000),
    admin.from('summaries')
      .select('episode_id, level, status, error_message, updated_at, episodes(title)')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(10),
    admin.from('transcripts')
      .select('episode_id, status, error_message, updated_at, episodes(title)')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(5),
  ]);

  const allSummaries = summaries ?? [];
  const allTranscripts = transcripts ?? [];

  // Summaries by level + status
  const levelStatusCounts: Record<string, number> = {};
  allSummaries.forEach(s => {
    const key = `${s.level}:${s.status}`;
    levelStatusCounts[key] = (levelStatusCounts[key] || 0) + 1;
  });
  const summariesByLevelAndStatus = Object.entries(levelStatusCounts).map(([key, count]) => {
    const [level, status] = key.split(':');
    return { level, status, count };
  });

  // Transcripts by status
  const transcriptStatusCounts: Record<string, number> = {};
  allTranscripts.forEach(t => {
    transcriptStatusCounts[t.status] = (transcriptStatusCounts[t.status] || 0) + 1;
  });
  const transcriptsByStatus = Object.entries(transcriptStatusCounts).map(([label, count]) => ({ label, count }));

  // Queue depth
  const queueStatuses = ['queued', 'transcribing', 'summarizing'];
  const queueDepth = allSummaries.filter(s => queueStatuses.includes(s.status)).length;

  // Failure rate
  const failedCount = allSummaries.filter(s => s.status === 'failed').length;
  const failureRate = allSummaries.length > 0 ? Math.round((failedCount / allSummaries.length) * 100) : 0;

  // Generation over time (by day)
  const genByDay: Record<string, number> = {};
  allSummaries.forEach(s => {
    if (s.status === 'ready') {
      const day = s.updated_at.split('T')[0];
      genByDay[day] = (genByDay[day] || 0) + 1;
    }
  });
  const generationOverTime = Object.entries(genByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // Recent failures
  const failures = [
    ...(recentFailedSummaries ?? []).map((s: { episode_id: string; episodes: { title: string } | { title: string }[] | null; level: string; error_message: string | null; updated_at: string }) => ({
      episode_id: s.episode_id,
      episode_title: (Array.isArray(s.episodes) ? s.episodes[0]?.title : s.episodes?.title) ?? 'Unknown',
      type: 'summary' as const,
      error_message: s.error_message,
      failed_at: s.updated_at,
    })),
    ...(recentFailedTranscripts ?? []).map((t: { episode_id: string; episodes: { title: string } | { title: string }[] | null; error_message: string | null; updated_at: string }) => ({
      episode_id: t.episode_id,
      episode_title: (Array.isArray(t.episodes) ? t.episodes[0]?.title : t.episodes?.title) ?? 'Unknown',
      type: 'transcript' as const,
      error_message: t.error_message,
      failed_at: t.updated_at,
    })),
  ].sort((a, b) => new Date(b.failed_at).getTime() - new Date(a.failed_at).getTime()).slice(0, 10);

  const data: AiAnalytics = {
    totalSummaries: allSummaries.length,
    totalTranscripts: allTranscripts.length,
    queueDepth,
    failureRate,
    summariesByLevelAndStatus,
    transcriptsByStatus,
    generationOverTime,
    recentFailures: failures,
  };

  return NextResponse.json(data);
}
