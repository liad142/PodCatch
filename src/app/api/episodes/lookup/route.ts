import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: Look up episode by audio URL and return its ID + summary status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const audioUrl = searchParams.get('audioUrl');

  if (!audioUrl) {
    return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    // Look up episode by audio URL
    const { data: episode, error } = await supabase
      .from('episodes')
      .select('id')
      .eq('audio_url', audioUrl)
      .single();

    if (error || !episode) {
      return NextResponse.json({ found: false });
    }

    // Check for summary status
    const { data: summary } = await supabase
      .from('summaries')
      .select('status')
      .eq('episode_id', episode.id)
      .eq('level', 'deep')
      .single();

    const summaryStatus = summary?.status || 'not_ready';

    return NextResponse.json({
      found: true,
      episodeId: episode.id,
      summaryStatus,
    });
  } catch (error) {
    console.error('Error looking up episode:', error);
    return NextResponse.json({ error: 'Failed to lookup episode' }, { status: 500 });
  }
}
