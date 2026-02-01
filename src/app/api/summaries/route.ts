import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: List all episodes with summaries
export async function GET(request: NextRequest) {
  try {
    // Get all summaries that are ready (deep level)
    const { data: summaries, error: summariesError } = await createServerClient()
      .from('summaries')
      .select('episode_id, updated_at')
      .eq('level', 'deep')
      .eq('status', 'ready')
      .order('updated_at', { ascending: false });

    if (summariesError) {
      console.error('Error fetching summaries:', summariesError);
      return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 });
    }

    if (!summaries || summaries.length === 0) {
      return NextResponse.json({ episodes: [] });
    }

    // Get unique episode IDs
    const episodeIds = [...new Set(summaries.map(s => s.episode_id))];

    // Fetch the episodes with their podcasts
    const { data: episodes, error: episodesError } = await createServerClient()
      .from('episodes')
      .select(`
        id,
        title,
        description,
        published_at,
        duration_seconds,
        podcast_id,
        podcasts (
          id,
          title,
          image_url,
          author
        )
      `)
      .in('id', episodeIds);

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
      return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
    }

    // Create a map of episode_id to summary updated_at for sorting
    const summaryDateMap = new Map(summaries.map(s => [s.episode_id, s.updated_at]));

    // Map and sort episodes by summary date
    const result = (episodes || [])
      .map((ep: any) => ({
        id: ep.id,
        title: ep.title,
        description: ep.description,
        published_at: ep.published_at,
        duration_seconds: ep.duration_seconds,
        summary_updated_at: summaryDateMap.get(ep.id),
        podcast: Array.isArray(ep.podcasts) ? ep.podcasts[0] : ep.podcasts,
      }))
      .sort((a, b) => {
        const dateA = a.summary_updated_at ? new Date(a.summary_updated_at).getTime() : 0;
        const dateB = b.summary_updated_at ? new Date(b.summary_updated_at).getTime() : 0;
        return dateB - dateA; // Most recent first
      });

    return NextResponse.json({ episodes: result });
  } catch (error) {
    console.error('Error in summaries API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
