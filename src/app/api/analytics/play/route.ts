import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth-helpers';
import type { PlayEventPayload } from '@/types/analytics';

export async function POST(request: NextRequest) {
  try {
    const body: PlayEventPayload = await request.json();
    const { action, session_id, episode_id, podcast_id } = body;

    if (!session_id || !episode_id || !podcast_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, episode_id, podcast_id, action' },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    try {
      const user = await getAuthUser();
      userId = user?.id || null;
    } catch {
      // Not authenticated — that's fine for play events
    }
    // sendBeacon embeds anonymous_id in the body since it can't set headers
    const anonymous_id = request.headers.get('x-anonymous-id') || (body as any).anonymous_id || null;
    const admin = createAdminClient();

    if (action === 'start') {
      const { error } = await admin
        .from('play_events')
        .insert({
          id: session_id,
          user_id: userId,
          anonymous_id,
          episode_id,
          podcast_id,
          source: body.source || null,
          episode_duration: body.episode_duration || null,
          playback_rate: body.playback_rate || 1.0,
          started_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[ANALYTICS] Play start insert error:', error.message, error.details);
        return NextResponse.json({ ok: false, error: error.message });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'update' || action === 'end') {
      const updateData: Record<string, unknown> = {};

      if (body.duration_listened !== undefined) updateData.duration_listened = body.duration_listened;
      if (body.max_position !== undefined) updateData.max_position = body.max_position;
      if (body.completed !== undefined) updateData.completed = body.completed;
      if (body.reached_60s !== undefined) updateData.reached_60s = body.reached_60s;
      if (body.reached_25pct !== undefined) updateData.reached_25pct = body.reached_25pct;
      if (body.reached_50pct !== undefined) updateData.reached_50pct = body.reached_50pct;
      if (body.reached_75pct !== undefined) updateData.reached_75pct = body.reached_75pct;
      if (body.playback_rate !== undefined) updateData.playback_rate = body.playback_rate;

      if (action === 'end') {
        updateData.ended_at = new Date().toISOString();
      }

      const { error } = await admin
        .from('play_events')
        .update(updateData)
        .eq('id', session_id);

      if (error) {
        console.error('[ANALYTICS] Play update error:', error.message, error.details);
        return NextResponse.json({ ok: false, error: error.message });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ANALYTICS] Play event error:', error);
    // Return 200 to avoid client-side error noise — analytics are best-effort
    return NextResponse.json({ ok: false, error: 'Failed to record play event' });
  }
}
