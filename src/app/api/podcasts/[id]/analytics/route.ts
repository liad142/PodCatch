import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getPodcastAnalytics } from '@/lib/analytics-service';
import { parseAnalyticsPeriod } from '@/lib/analytics-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const period = parseAnalyticsPeriod(request.nextUrl.searchParams.get('period'));

  try {
    const analytics = await getPodcastAnalytics(id, period);
    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[ANALYTICS] Podcast analytics error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
