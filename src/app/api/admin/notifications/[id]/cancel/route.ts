import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

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
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  if (notification.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending notifications can be cancelled' }, { status: 400 });
  }

  await admin
    .from('notification_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
