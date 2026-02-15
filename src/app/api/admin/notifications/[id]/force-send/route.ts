import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSummaryEmail } from '@/lib/notifications/send-email';
import { sendTelegramMessage } from '@/lib/notifications/send-telegram';
import { buildShareContent } from '@/lib/notifications/format-message';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: notification, error: fetchError } = await admin
    .from('notification_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  if (notification.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending notifications can be force-sent' }, { status: 400 });
  }

  // Build content (may throw if summary not ready, but we proceed anyway for force-send)
  let content;
  try {
    content = await buildShareContent(notification.episode_id);
  } catch {
    // Fallback: minimal content when summary isn't ready
    const { data: episode } = await admin
      .from('episodes')
      .select('title, podcast_id')
      .eq('id', notification.episode_id)
      .single();

    const { data: podcast } = await admin
      .from('podcasts')
      .select('title, image_url')
      .eq('id', episode?.podcast_id)
      .single();

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    content = {
      episodeTitle: episode?.title || 'Episode',
      podcastName: podcast?.title || 'Podcast',
      podcastImageUrl: podcast?.image_url || null,
      hookHeadline: episode?.title || 'New episode analysis available',
      highlights: [],
      insightsUrl: `${APP_URL}/episode/${notification.episode_id}/insights`,
    };
  }

  let result: { success: boolean; error?: string };
  if (notification.channel === 'email') {
    result = await sendSummaryEmail(notification.recipient, content);
  } else {
    result = await sendTelegramMessage(notification.recipient, content);
  }

  if (result.success) {
    await admin
      .from('notification_requests')
      .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
      .eq('id', id);
    return NextResponse.json({ success: true });
  }

  await admin
    .from('notification_requests')
    .update({ status: 'failed', error_message: result.error })
    .eq('id', id);

  return NextResponse.json({ error: result.error }, { status: 500 });
}
