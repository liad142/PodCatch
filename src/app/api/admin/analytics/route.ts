import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSystemPlayAnalytics } from '@/lib/analytics-service';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const analytics = await getSystemPlayAnalytics();
    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[ANALYTICS] System analytics error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
