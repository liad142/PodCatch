import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST: Batch lookup episodes by audio URLs and return their IDs + summary statuses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioUrls } = body as { audioUrls: string[] };

    if (!audioUrls || !Array.isArray(audioUrls) || audioUrls.length === 0) {
      return NextResponse.json({ error: 'audioUrls array is required' }, { status: 400 });
    }

    // Limit batch size
    if (audioUrls.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 URLs per batch' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Single query: fetch episodes with their deep summaries using Supabase relationship
    // This eliminates the N+1 query pattern by using a JOIN under the hood
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select(`
        id,
        audio_url,
        summaries!left (
          status,
          level
        )
      `)
      .in('audio_url', audioUrls);

    if (episodesError) {
      console.error('Error looking up episodes:', episodesError);
      return NextResponse.json({ error: 'Failed to lookup episodes' }, { status: 500 });
    }

    // If no episodes found, return empty results
    if (!episodes || episodes.length === 0) {
      return NextResponse.json({ results: {} });
    }

    // Status priority: ready > summarizing > transcribing > queued > failed > not_ready
    const statusPriority: Record<string, number> = {
      ready: 6,
      summarizing: 5,
      transcribing: 4,
      queued: 3,
      failed: 2,
      not_ready: 1,
    };

    // Build results directly from the joined data
    const results: Record<string, { episodeId: string; summaryStatus: string }> = {};

    for (const episode of episodes) {
      // Find the BEST deep summary status from the joined summaries array
      // (prioritize 'ready' over other statuses)
      let bestStatus = 'not_ready';
      let bestPriority = 0;

      if (Array.isArray(episode.summaries)) {
        for (const summary of episode.summaries) {
          if (summary.level === 'deep') {
            const priority = statusPriority[summary.status] || 0;
            if (priority > bestPriority) {
              bestPriority = priority;
              bestStatus = summary.status;
            }
          }
        }
      }

      results[episode.audio_url] = {
        episodeId: episode.id,
        summaryStatus: bestStatus,
      };
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Batch lookup error:', error);
    return NextResponse.json({ error: 'Failed to batch lookup episodes' }, { status: 500 });
  }
}
