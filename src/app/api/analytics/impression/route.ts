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

    let userId: string | null = null;
    try {
      const user = await getAuthUser();
      userId = user?.id || null;
    } catch {
      // Not authenticated — that's fine for impressions
    }
    const anonymous_id = request.headers.get('x-anonymous-id') || null;
    const admin = createAdminClient();

    const rows = body.impressions.map((imp) => ({
      user_id: userId,
      anonymous_id,
      podcast_id: imp.podcast_id || null,
      episode_id: imp.episode_id || null,
      surface: imp.surface,
      position: imp.position ?? 0,
    }));

    const { error } = await admin.from('impression_events').insert(rows);

    if (error) {
      console.error('[ANALYTICS] Impression insert error:', error.message, error.details);
      // Don't fail the request for analytics — return success to avoid client retries
      return NextResponse.json({ ok: false, error: error.message });
    }
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (error) {
    console.error('[ANALYTICS] Impression event error:', error);
    // Return 200 to avoid client-side error noise — analytics are best-effort
    return NextResponse.json({ ok: false, error: 'Failed to record impressions' });
  }
}
