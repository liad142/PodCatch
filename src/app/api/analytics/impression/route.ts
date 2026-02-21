import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth-helpers';
import type { ImpressionEventPayload } from '@/types/analytics';

export async function POST(request: NextRequest) {
  try {
    const body: ImpressionEventPayload = await request.json();

    if (!body.impressions?.length) {
      return NextResponse.json({ error: 'No impressions provided' }, { status: 400 });
    }

    // Cap batch size
    if (body.impressions.length > 50) {
      return NextResponse.json({ error: 'Too many impressions (max 50)' }, { status: 400 });
    }

    const user = await getAuthUser();
    const anonymous_id = request.headers.get('x-anonymous-id') || null;
    const admin = createAdminClient();

    const rows = body.impressions.map((imp) => ({
      user_id: user?.id || null,
      anonymous_id,
      podcast_id: imp.podcast_id || null,
      episode_id: imp.episode_id || null,
      surface: imp.surface,
      position: imp.position,
    }));

    const { error } = await admin.from('impression_events').insert(rows);

    if (error) throw error;
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (error) {
    console.error('[ANALYTICS] Impression event error:', error);
    return NextResponse.json({ error: 'Failed to record impressions' }, { status: 500 });
  }
}
