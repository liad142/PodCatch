import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: List all episodes with summaries
export async function GET(request: NextRequest) {
  try {
    // Get all summaries with their episodes and podcasts in a single query
    const { data: summaries, error: summariesError } = await createAdminClient()
      .from('summaries')
      .select(`
        episode_id,
        updated_at,
        episodes!inner (
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
        )
      `)
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

    // Deduplicate by episode_id (keep the first/most recent due to order above)
    const seen = new Set<string>();
    const result = summaries
      .filter((s: any) => {
        if (seen.has(s.episode_id)) return false;
        seen.add(s.episode_id);
        return true;
      })
      .map((s: any) => {
        const ep = s.episodes;
        return {
          id: ep.id,
          title: ep.title,
          description: ep.description,
          published_at: ep.published_at,
          duration_seconds: ep.duration_seconds,
          summary_updated_at: s.updated_at,
          podcast: Array.isArray(ep.podcasts) ? ep.podcasts[0] : ep.podcasts,
        };
      });

    return NextResponse.json({ episodes: result });
  } catch (error) {
    console.error('Error in summaries API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
