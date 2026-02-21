import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const admin = createAdminClient();

    // Compute rollups for yesterday (or any day without rollups)
    const { data, error: rpcError } = await admin.rpc('exec_sql', {
      query: `
        INSERT INTO analytics_daily_rollups (date, podcast_id, episode_id, total_plays, unique_listeners, total_listen_seconds, completions, total_impressions)
        SELECT
          pe.started_at::date AS date,
          pe.podcast_id,
          pe.episode_id,
          COUNT(*) AS total_plays,
          COUNT(DISTINCT COALESCE(pe.user_id::text, pe.anonymous_id)) AS unique_listeners,
          COALESCE(SUM(pe.duration_listened), 0) AS total_listen_seconds,
          COUNT(*) FILTER (WHERE pe.completed) AS completions,
          COALESCE(imp.impression_count, 0) AS total_impressions
        FROM play_events pe
        LEFT JOIN (
          SELECT
            created_at::date AS date,
            podcast_id,
            episode_id,
            COUNT(*) AS impression_count
          FROM impression_events
          WHERE created_at::date = (CURRENT_DATE - INTERVAL '1 day')::date
          GROUP BY created_at::date, podcast_id, episode_id
        ) imp ON imp.date = pe.started_at::date
            AND imp.podcast_id = pe.podcast_id
            AND imp.episode_id = pe.episode_id
        WHERE pe.started_at::date = (CURRENT_DATE - INTERVAL '1 day')::date
          AND pe.reached_60s = true
        GROUP BY pe.started_at::date, pe.podcast_id, pe.episode_id, imp.impression_count
        ON CONFLICT (date, podcast_id, episode_id) DO UPDATE SET
          total_plays = EXCLUDED.total_plays,
          unique_listeners = EXCLUDED.unique_listeners,
          total_listen_seconds = EXCLUDED.total_listen_seconds,
          completions = EXCLUDED.completions,
          total_impressions = EXCLUDED.total_impressions
      `,
    });

    if (rpcError) throw rpcError;

    return NextResponse.json({ ok: true, message: 'Rollup completed for yesterday' });
  } catch (err) {
    console.error('[ANALYTICS] Rollup error:', err);
    return NextResponse.json({ error: 'Failed to compute rollup' }, { status: 500 });
  }
}
