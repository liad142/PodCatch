import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestSummary, checkExistingSummary, getSummariesStatus } from "@/lib/summary-service";
import { getAuthUser } from "@/lib/auth-helpers";
import { resolvePodcastLanguage } from "@/lib/language-utils";
import { checkQuota, isAdminEmail, checkRateLimit } from "@/lib/cache";
import type { SummaryLevel } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function logWithTime(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[API /summaries ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

// GET /api/episodes/:id/summaries - Get both summary levels with statuses
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    logWithTime('GET request received', { episodeId: id });
    const result = await getSummariesStatus(id);
    logWithTime('GET request completed', { episodeId: id });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 });
  }
}

// POST /api/episodes/:id/summaries - Request summary generation (idempotent)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5 requests/min per user
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rlAllowed = await checkRateLimit(`summary:${user.id || ip}`, 5, 60);
    if (!rlAllowed) {
      return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
    }

    // Per-user daily quota (skip for admins)
    if (!isAdminEmail(user.email)) {
      const quota = await checkQuota(user.id, 'summary', 5);
      if (!quota.allowed) {
        return NextResponse.json({
          error: 'Daily summary limit reached',
          limit: quota.limit,
          used: quota.used,
          upgrade_url: '/pricing',
        }, { status: 429 });
      }
    }

    const { id } = await params;
    const body = await request.json();
    const level: SummaryLevel = body.level || 'quick';

    if (!['quick', 'deep'].includes(level)) {
      return NextResponse.json({ error: 'Invalid level. Must be "quick" or "deep".' }, { status: 400 });
    }

    logWithTime('POST request received', { episodeId: id, level });

    // Get episode with podcast info - language comes from RSS feed
    logWithTime('Fetching episode and podcast from DB...');
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        audio_url,
        transcript_url,
        title,
        podcasts!inner (id, title, language, rss_feed_url)
      `)
      .eq('id', id)
      .single();

    if (episodeError || !episode) {
      logWithTime('Episode not found', { episodeId: id, error: episodeError });
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Self-healing language detection via shared utility
    const podcastData = episode.podcasts as unknown as { id: string; title: string; language: string | null; rss_feed_url: string } | null;
    const language = await resolvePodcastLanguage(podcastData, supabase);

    // Build metadata for Apple Podcasts transcript lookup
    const metadata = podcastData?.title && episode.title
      ? { podcastTitle: podcastData.title, episodeTitle: episode.title }
      : undefined;

    logWithTime('Episode found, checking existing summary...', {
      audioUrl: episode.audio_url?.substring(0, 50) + '...',
      transcriptUrl: episode.transcript_url ? 'YES (FREE!)' : 'NO',
      hasAppleMetadata: !!metadata,
      language
    });

    // Quick check: if summary already exists and is ready/in-progress, return immediately
    const existing = await checkExistingSummary(id, level, language || 'en');
    if (existing) {
      logWithTime('Returning existing summary status', { status: existing.status });
      return NextResponse.json({ episodeId: id, level, ...existing });
    }

    // Fire off the heavy generation in the background (non-blocking)
    // The frontend polls GET /summaries to track progress
    const userId = user.id;
    const resolvedLanguage = language || undefined;
    requestSummary(
      id,
      level,
      episode.audio_url,
      resolvedLanguage,
      episode.transcript_url || undefined,
      metadata
    ).then(async (result) => {
      // Record user ownership after completion (non-blocking)
      if (result.status === 'ready') {
        try {
          const admin = createAdminClient();
          const { data: summaryRecord } = await admin
            .from('summaries')
            .select('id')
            .eq('episode_id', id)
            .eq('level', level)
            .eq('language', language || 'en')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          if (summaryRecord) {
            await admin
              .from('user_summaries')
              .upsert({
                user_id: userId,
                summary_id: summaryRecord.id,
                episode_id: id,
              }, { onConflict: 'user_id,summary_id', ignoreDuplicates: true });
          }
        } catch (err) {
          logWithTime('Failed to record user_summary (non-blocking)', { error: String(err) });
        }
      }
      logWithTime('Background generation completed', {
        episodeId: id,
        level,
        status: result.status,
        totalDurationMs: Date.now() - startTime,
        totalDurationSec: ((Date.now() - startTime) / 1000).toFixed(1)
      });
    }).catch((err) => {
      logWithTime('Background generation FAILED', { episodeId: id, level, error: String(err) });
    });

    // Return immediately — the summary record was created by requestSummary's
    // initial upsert, so polling will find it with status "transcribing"
    logWithTime('POST returning immediately (background generation started)', { episodeId: id, level });
    return NextResponse.json({
      episodeId: id,
      level,
      status: 'transcribing',
    });
  } catch (error) {
    logWithTime('POST request FAILED', {
      error: error instanceof Error ? error.message : String(error),
      totalDurationMs: Date.now() - startTime
    });
    console.error('Error requesting summary:', error);
    return NextResponse.json({ error: 'Failed to request summary' }, { status: 500 });
  }
}
