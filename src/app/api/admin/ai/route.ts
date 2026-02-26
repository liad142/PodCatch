import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCached, setCached, CacheTTL } from '@/lib/cache';
import type { AiAnalytics } from '@/types/admin';

const CACHE_KEY = 'admin:ai-analytics';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  // Check Redis cache first (15 min TTL)
  const cached = await getCached<AiAnalytics>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached);
  }

  const admin = createAdminClient();

  // Use COUNT queries instead of fetching all rows
  const [
    { count: totalSummaries },
    { count: totalTranscripts },
    { data: summaryStatusCounts },
    { data: transcriptStatusCounts },
    { data: recentFailedSummaries },
    { data: recentFailedTranscripts },
  ] = await Promise.all([
    admin.from('summaries').select('*', { count: 'exact', head: true }),
    admin.from('transcripts').select('*', { count: 'exact', head: true }),
    // Fetch only level + status for grouping (no content_json, much lighter)
    admin.from('summaries').select('level, status').limit(5000),
    admin.from('transcripts').select('status').limit(5000),
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

  const allSummaryStatuses = summaryStatusCounts ?? [];
  const allTranscriptStatuses = transcriptStatusCounts ?? [];

  // Summaries by level + status
  const levelStatusCounts: Record<string, number> = {};
  allSummaryStatuses.forEach(s => {
    const key = `${s.level}:${s.status}`;
    levelStatusCounts[key] = (levelStatusCounts[key] || 0) + 1;
  });
  const summariesByLevelAndStatus = Object.entries(levelStatusCounts).map(([key, count]) => {
    const [level, status] = key.split(':');
    return { level, status, count };
  });

  // Transcripts by status
  const tStatusCounts: Record<string, number> = {};
  allTranscriptStatuses.forEach(t => {
    tStatusCounts[t.status] = (tStatusCounts[t.status] || 0) + 1;
  });
  const transcriptsByStatus = Object.entries(tStatusCounts).map(([label, count]) => ({ label, count }));

  // Queue depth
  const queueStatuses = ['queued', 'transcribing', 'summarizing'];
  const queueDepth = allSummaryStatuses.filter(s => queueStatuses.includes(s.status)).length;

  // Failure rate
  const failedCount = allSummaryStatuses.filter(s => s.status === 'failed').length;
  const total = totalSummaries ?? allSummaryStatuses.length;
  const failureRate = total > 0 ? Math.round((failedCount / total) * 100) : 0;

  // Generation over time — fetch only ready summaries with minimal fields
  const { data: readySummaries } = await admin
    .from('summaries')
    .select('updated_at')
    .eq('status', 'ready')
    .order('updated_at', { ascending: false })
    .limit(2000);

  const genByDay: Record<string, number> = {};
  (readySummaries ?? []).forEach(s => {
    const day = s.updated_at.split('T')[0];
    genByDay[day] = (genByDay[day] || 0) + 1;
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
    totalSummaries: totalSummaries ?? 0,
    totalTranscripts: totalTranscripts ?? 0,
    queueDepth,
    failureRate,
    summariesByLevelAndStatus,
    transcriptsByStatus,
    generationOverTime,
    recentFailures: failures,
  };

  // Cache for 15 minutes
  await setCached(CACHE_KEY, data, CacheTTL.ANALYTICS);

  return NextResponse.json(data);
}
