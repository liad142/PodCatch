import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { fetchUserSubscriptions } from '@/lib/youtube/api';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subscriptions = await fetchUserSubscriptions(user.id);
    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error('[YT_SUBS] Error fetching subscriptions:', err);
    return NextResponse.json({ subscriptions: [] });
  }
}
