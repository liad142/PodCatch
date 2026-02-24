import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { fetchUserSubscriptions } from '@/lib/youtube/api';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log(`[YT_SUBS] Fetching subscriptions for user=${user.id.slice(0, 8)}…`);
    const subscriptions = await fetchUserSubscriptions(user.id);
    console.log(`[YT_SUBS] Found ${subscriptions.length} subscriptions`);
    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error('[YT_SUBS] Error fetching subscriptions:', err);
    return NextResponse.json({ subscriptions: [] });
  }
}
