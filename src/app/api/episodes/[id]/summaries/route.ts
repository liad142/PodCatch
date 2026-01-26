import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requestSummary, getSummariesStatus } from "@/lib/summary-service";
import type { SummaryLevel } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/episodes/:id/summaries - Get both summary levels with statuses
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await getSummariesStatus(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 });
  }
}

// POST /api/episodes/:id/summaries - Request summary generation (idempotent)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const level: SummaryLevel = body.level || 'quick';
    const language = body.language || 'en';

    // Get episode to find audio URL
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('audio_url')
      .eq('id', id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    const result = await requestSummary(id, level, episode.audio_url, language);
    
    return NextResponse.json({
      episodeId: id,
      level,
      ...result
    });
  } catch (error) {
    console.error('Error requesting summary:', error);
    return NextResponse.json({ error: 'Failed to request summary' }, { status: 500 });
  }
}
