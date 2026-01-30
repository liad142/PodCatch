import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requestSummary, getSummariesStatus } from "@/lib/summary-service";
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
    const { id } = await params;
    const body = await request.json();
    const level: SummaryLevel = body.level || 'quick';
    const language = body.language || 'en';

    logWithTime('POST request received', { episodeId: id, level, language });

    // Get episode to find audio URL
    logWithTime('Fetching episode from DB...');
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('audio_url')
      .eq('id', id)
      .single();

    if (episodeError || !episode) {
      logWithTime('Episode not found', { episodeId: id, error: episodeError });
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    logWithTime('Episode found, calling requestSummary...', { audioUrl: episode.audio_url?.substring(0, 50) + '...' });
    const result = await requestSummary(id, level, episode.audio_url, language);

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
