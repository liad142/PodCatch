import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getEpisodeAnalytics } from '@/lib/analytics-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    const analytics = await getEpisodeAnalytics(id);
    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[ANALYTICS] Episode analytics error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
