import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requestSummary, getSummariesStatus } from "@/lib/summary-service";
import { getAuthUser } from "@/lib/auth-helpers";
import { resolvePodcastLanguage } from "@/lib/language-utils";
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
    return NextResponse.json(result);
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
        podcasts!inner (id, language, rss_feed_url)
      `)
      .eq('id', id)
      .single();

    if (episodeError || !episode) {
      logWithTime('Episode not found', { episodeId: id, error: episodeError });
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Self-healing language detection via shared utility
    const podcastData = episode.podcasts as unknown as { id: string; language: string | null; rss_feed_url: string } | null;
    const language = await resolvePodcastLanguage(podcastData, supabase);

    logWithTime('Episode found, calling requestSummary...', { 
      audioUrl: episode.audio_url?.substring(0, 50) + '...',
      transcriptUrl: episode.transcript_url ? 'YES (FREE!)' : 'NO',
      language
    });
    
    // Pass transcript URL for FREE transcription (Priority A)
    const result = await requestSummary(
      id,
      level,
      episode.audio_url,
      language || undefined,
      episode.transcript_url || undefined  // Priority A: FREE transcript from RSS
    );

    logWithTime('POST request completed', {
      episodeId: id,
      status: result.status,
      totalDurationMs: Date.now() - startTime,
      totalDurationSec: ((Date.now() - startTime) / 1000).toFixed(1)
    });

    return NextResponse.json({
      episodeId: id,
      level,
      ...result
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
