import { createAdminClient } from '@/lib/supabase/admin';
import { getCached, setCached, CacheKeys, CacheTTL } from '@/lib/cache';
import type {
  PodcastAnalytics,
  EpisodeAnalytics,
  SystemPlayAnalytics,
  AnalyticsPeriod,
} from '@/types/analytics';
import type { TimeSeriesPoint, LabeledCount } from '@/types/admin';
import { periodToDays } from '@/lib/analytics-utils';

// ── Helpers ──

function dateFilterGte(period: AnalyticsPeriod, column: string): string {
  const days = periodToDays(period);
  if (!days) return 'TRUE';
  return `${column} >= NOW() - INTERVAL '${days} days'`;
}

function buildTimeSeries(
  rows: { date: string; count: number }[],
  period: AnalyticsPeriod,
): TimeSeriesPoint[] {
  return rows.map((r) => ({ date: r.date, value: r.count }));
}

// ── Podcast Analytics ──

export async function getPodcastAnalytics(
  podcastId: string,
  period: AnalyticsPeriod,
): Promise<PodcastAnalytics> {
  const cacheKey = CacheKeys.podcastAnalytics(podcastId, period);
  const cached = await getCached<PodcastAnalytics>(cacheKey);
  if (cached) return cached;

  const admin = createAdminClient();
  const days = periodToDays(period);
  const dateFilter = days
    ? `AND started_at >= NOW() - INTERVAL '${days} days'`
    : '';
  const impressionDateFilter = days
    ? `AND created_at >= NOW() - INTERVAL '${days} days'`
    : '';

  // Parallel queries
  const [
    playStats,
    playsOverTime,
    listenersOverTime,
    topEpisodes,
    sources,
    impressionCount,
    followerData,
  ] = await Promise.all([
    // Aggregate play stats
    admin.rpc('exec_sql', {
      query: `
        SELECT
          COUNT(*) AS total_plays,
          COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS unique_listeners,
          COALESCE(SUM(duration_listened), 0) AS total_listen_seconds
        FROM play_events
        WHERE podcast_id = '${podcastId}' AND reached_60s = true ${dateFilter}
      `,
    }),

    // Plays over time
    admin.rpc('exec_sql', {
      query: `
        SELECT started_at::date AS date, COUNT(*) AS count
        FROM play_events
        WHERE podcast_id = '${podcastId}' AND reached_60s = true ${dateFilter}
        GROUP BY started_at::date
        ORDER BY date
      `,
    }),

    // Listeners over time
    admin.rpc('exec_sql', {
      query: `
        SELECT started_at::date AS date,
               COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS count
        FROM play_events
        WHERE podcast_id = '${podcastId}' AND reached_60s = true ${dateFilter}
        GROUP BY started_at::date
        ORDER BY date
      `,
    }),

    // Top episodes
    admin.rpc('exec_sql', {
      query: `
        SELECT
          pe.episode_id,
          COUNT(*) AS plays,
          COUNT(DISTINCT COALESCE(pe.user_id::text, pe.anonymous_id)) AS listeners,
          ROUND(AVG(pe.duration_listened)) AS avg_duration,
          ROUND(100.0 * COUNT(*) FILTER (WHERE pe.completed) / NULLIF(COUNT(*), 0)) AS completion_rate
        FROM play_events pe
        WHERE pe.podcast_id = '${podcastId}' AND pe.reached_60s = true ${dateFilter}
        GROUP BY pe.episode_id
        ORDER BY plays DESC
        LIMIT 20
      `,
    }),

    // Discovery sources
    admin.rpc('exec_sql', {
      query: `
        SELECT COALESCE(source, 'direct') AS label, COUNT(*) AS count
        FROM play_events
        WHERE podcast_id = '${podcastId}' ${dateFilter}
        GROUP BY source
        ORDER BY count DESC
      `,
    }),

    // Impression count
    admin.rpc('exec_sql', {
      query: `
        SELECT COUNT(*) AS count
        FROM impression_events
        WHERE podcast_id = '${podcastId}' ${impressionDateFilter}
      `,
    }),

    // Follower count + growth
    admin.rpc('exec_sql', {
      query: `
        SELECT
          COUNT(*) AS follower_count,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${days || 9999} days') AS new_followers
        FROM podcast_subscriptions
        WHERE podcast_id = '${podcastId}'
      `,
    }),
  ]);

  const stats = playStats.data?.[0] || { total_plays: 0, unique_listeners: 0, total_listen_seconds: 0 };
  const totalImpressions = parseInt(impressionCount.data?.[0]?.count || '0');
  const totalPlays = parseInt(stats.total_plays || '0');
  const followers = followerData.data?.[0] || { follower_count: 0, new_followers: 0 };

  // Enrich top episodes with titles from episodes table
  const episodeIds = (topEpisodes.data || []).map((e: { episode_id: string }) => e.episode_id);
  let episodeTitles: Record<string, string> = {};
  if (episodeIds.length > 0) {
    const { data: episodes } = await admin
      .from('episodes')
      .select('id, title')
      .in('id', episodeIds);
    if (episodes) {
      episodeTitles = Object.fromEntries(episodes.map((e: { id: string; title: string }) => [e.id, e.title]));
    }
  }

  const result: PodcastAnalytics = {
    totalPlays,
    uniqueListeners: parseInt(stats.unique_listeners || '0'),
    totalListenHours: Math.round(parseInt(stats.total_listen_seconds || '0') / 3600 * 10) / 10,
    followerCount: parseInt(followers.follower_count || '0'),
    followerGrowth: parseInt(followers.new_followers || '0'),
    impressionToPlayRate: totalImpressions > 0 ? Math.round((totalPlays / totalImpressions) * 1000) / 10 : 0,
    playsOverTime: buildTimeSeries(playsOverTime.data || [], period),
    listenersOverTime: buildTimeSeries(listenersOverTime.data || [], period),
    subscribersOverTime: [], // Would need subscription history table
    topEpisodes: (topEpisodes.data || []).map((e: Record<string, string | number>) => ({
      episode_id: e.episode_id as string,
      title: episodeTitles[e.episode_id as string] || e.episode_id,
      plays: parseInt(String(e.plays || '0')),
      listeners: parseInt(String(e.listeners || '0')),
      avg_duration: parseInt(String(e.avg_duration || '0')),
      completion_rate: parseInt(String(e.completion_rate || '0')),
    })),
    discoverySources: (sources.data || []) as LabeledCount[],
  };

  await setCached(cacheKey, result, CacheTTL.ANALYTICS);
  return result;
}

// ── Episode Analytics ──

export async function getEpisodeAnalytics(
  episodeId: string,
): Promise<EpisodeAnalytics> {
  const cacheKey = CacheKeys.episodeAnalytics(episodeId);
  const cached = await getCached<EpisodeAnalytics>(cacheKey);
  if (cached) return cached;

  const admin = createAdminClient();

  const [playStats, retention, playsOverTime, sources, podcastAvg] = await Promise.all([
    // Aggregate stats
    admin.rpc('exec_sql', {
      query: `
        SELECT
          COUNT(*) AS total_plays,
          COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS unique_listeners,
          ROUND(AVG(duration_listened)) AS avg_duration,
          ROUND(100.0 * COUNT(*) FILTER (WHERE completed) / NULLIF(COUNT(*), 0)) AS completion_rate
        FROM play_events
        WHERE episode_id = '${episodeId}' AND reached_60s = true
      `,
    }),

    // Retention funnel
    admin.rpc('exec_sql', {
      query: `
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE reached_60s) AS at_60s,
          COUNT(*) FILTER (WHERE reached_25pct) AS at_25pct,
          COUNT(*) FILTER (WHERE reached_50pct) AS at_50pct,
          COUNT(*) FILTER (WHERE reached_75pct) AS at_75pct,
          COUNT(*) FILTER (WHERE completed) AS at_complete
        FROM play_events
        WHERE episode_id = '${episodeId}'
      `,
    }),

    // Plays over time
    admin.rpc('exec_sql', {
      query: `
        SELECT started_at::date AS date, COUNT(*) AS count
        FROM play_events
        WHERE episode_id = '${episodeId}' AND reached_60s = true
        GROUP BY started_at::date
        ORDER BY date
      `,
    }),

    // Sources
    admin.rpc('exec_sql', {
      query: `
        SELECT COALESCE(source, 'direct') AS label, COUNT(*) AS count
        FROM play_events
        WHERE episode_id = '${episodeId}'
        GROUP BY source
        ORDER BY count DESC
      `,
    }),

    // Podcast average (for comparison)
    admin.rpc('exec_sql', {
      query: `
        WITH episode_podcast AS (
          SELECT podcast_id FROM play_events WHERE episode_id = '${episodeId}' LIMIT 1
        )
        SELECT
          ROUND(AVG(play_count)) AS avg_plays,
          ROUND(AVG(avg_duration)) AS avg_duration,
          ROUND(AVG(completion_rate)) AS avg_completion
        FROM (
          SELECT
            episode_id,
            COUNT(*) AS play_count,
            AVG(duration_listened) AS avg_duration,
            100.0 * COUNT(*) FILTER (WHERE completed) / NULLIF(COUNT(*), 0) AS completion_rate
          FROM play_events
          WHERE podcast_id = (SELECT podcast_id FROM episode_podcast)
            AND reached_60s = true
          GROUP BY episode_id
        ) ep_stats
      `,
    }),
  ]);

  const stats = playStats.data?.[0] || {};
  const ret = retention.data?.[0] || {};
  const total = parseInt(ret.total || '0');
  const avg = podcastAvg.data?.[0] || {};

  const retentionCurve = [
    { milestone: 'Start', percentage: 100, count: total },
    { milestone: '60s', percentage: total > 0 ? Math.round((parseInt(ret.at_60s || '0') / total) * 100) : 0, count: parseInt(ret.at_60s || '0') },
    { milestone: '25%', percentage: total > 0 ? Math.round((parseInt(ret.at_25pct || '0') / total) * 100) : 0, count: parseInt(ret.at_25pct || '0') },
    { milestone: '50%', percentage: total > 0 ? Math.round((parseInt(ret.at_50pct || '0') / total) * 100) : 0, count: parseInt(ret.at_50pct || '0') },
    { milestone: '75%', percentage: total > 0 ? Math.round((parseInt(ret.at_75pct || '0') / total) * 100) : 0, count: parseInt(ret.at_75pct || '0') },
    { milestone: '100%', percentage: total > 0 ? Math.round((parseInt(ret.at_complete || '0') / total) * 100) : 0, count: parseInt(ret.at_complete || '0') },
  ];

  const episodePlays = parseInt(stats.total_plays || '0');
  const episodeAvgDuration = parseInt(stats.avg_duration || '0');
  const episodeCompletion = parseInt(stats.completion_rate || '0');

  const result: EpisodeAnalytics = {
    totalPlays: episodePlays,
    uniqueListeners: parseInt(stats.unique_listeners || '0'),
    avgListenDuration: episodeAvgDuration,
    completionRate: episodeCompletion,
    retentionCurve,
    performanceVsAvg: [
      { metric: 'Plays', episode: episodePlays, podcastAvg: parseInt(avg.avg_plays || '0') },
      { metric: 'Avg Duration (s)', episode: episodeAvgDuration, podcastAvg: parseInt(avg.avg_duration || '0') },
      { metric: 'Completion %', episode: episodeCompletion, podcastAvg: parseInt(avg.avg_completion || '0') },
    ],
    discoverySources: (sources.data || []) as LabeledCount[],
    playsOverTime: buildTimeSeries(playsOverTime.data || [], '30d'),
  };

  await setCached(cacheKey, result, CacheTTL.ANALYTICS);
  return result;
}

// ── System-wide Play Analytics (admin) ──

export async function getSystemPlayAnalytics(): Promise<SystemPlayAnalytics> {
  const cacheKey = CacheKeys.adminPlayAnalytics();
  const cached = await getCached<SystemPlayAnalytics>(cacheKey);
  if (cached) return cached;

  const admin = createAdminClient();

  const [stats, playsOverTime, topPodcasts] = await Promise.all([
    admin.rpc('exec_sql', {
      query: `
        SELECT
          COUNT(*) AS total_plays,
          COALESCE(SUM(duration_listened), 0) AS total_listen_seconds,
          COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS unique_listeners
        FROM play_events
        WHERE reached_60s = true
      `,
    }),

    admin.rpc('exec_sql', {
      query: `
        SELECT started_at::date AS date, COUNT(*) AS count
        FROM play_events
        WHERE reached_60s = true AND started_at >= NOW() - INTERVAL '30 days'
        GROUP BY started_at::date
        ORDER BY date
      `,
    }),

    admin.rpc('exec_sql', {
      query: `
        SELECT pe.podcast_id, p.title, COUNT(*) AS plays, p.image_url
        FROM play_events pe
        JOIN podcasts p ON p.id = pe.podcast_id
        WHERE pe.reached_60s = true
        GROUP BY pe.podcast_id, p.title, p.image_url
        ORDER BY plays DESC
        LIMIT 10
      `,
    }),
  ]);

  const s = stats.data?.[0] || {};

  const result: SystemPlayAnalytics = {
    totalPlays: parseInt(s.total_plays || '0'),
    totalListenHours: Math.round(parseInt(s.total_listen_seconds || '0') / 3600 * 10) / 10,
    uniqueListeners: parseInt(s.unique_listeners || '0'),
    playsOverTime: buildTimeSeries(playsOverTime.data || [], '30d'),
    topPodcastsByPlays: (topPodcasts.data || []).map((p: Record<string, string | number>) => ({
      podcast_id: p.podcast_id,
      title: p.title,
      plays: parseInt(String(p.plays || '0')),
      image_url: p.image_url || null,
    })),
  };

  await setCached(cacheKey, result, CacheTTL.ANALYTICS);
  return result;
}
