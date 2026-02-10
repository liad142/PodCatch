import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCacheHealth } from '@/lib/cache';
import type { SystemHealth } from '@/types/admin';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();

  const [redisHealth, { data: failedSummaries }, { data: failedTranscripts }] = await Promise.all([
    getCacheHealth(),
    admin.from('summaries')
      .select('episode_id, error_message, updated_at')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(15),
    admin.from('transcripts')
      .select('episode_id, error_message, updated_at')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(10),
  ]);

  const recentErrors = [
    ...(failedSummaries ?? []).map(s => ({
      type: 'Summary failure',
      message: s.error_message || 'Unknown error',
      timestamp: s.updated_at,
      episode_id: s.episode_id,
    })),
    ...(failedTranscripts ?? []).map(t => ({
      type: 'Transcript failure',
      message: t.error_message || 'Unknown error',
      timestamp: t.updated_at,
      episode_id: t.episode_id,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

  const data: SystemHealth = {
    redis: redisHealth,
    recentErrors,
  };

  return NextResponse.json(data);
}
