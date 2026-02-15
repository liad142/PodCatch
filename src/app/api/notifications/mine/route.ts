import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('notification_requests')
      .select(`
        *,
        episodes!inner (
          title,
          podcast_id,
          podcasts!inner (
            title,
            image_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Flatten the joined data to match NotificationWithEpisode shape
    const notifications = (data || []).map((row: Record<string, unknown>) => {
      const episodes = row.episodes as Record<string, unknown>;
      const podcasts = episodes.podcasts as Record<string, unknown>;
      const { episodes: _episodes, ...rest } = row;
      return {
        ...rest,
        episode_title: episodes.title as string,
        podcast_name: podcasts.title as string,
        podcast_image_url: (podcasts.image_url as string) || null,
      };
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
