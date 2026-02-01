import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// DELETE: Unsubscribe from a podcast
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ podcastId: string }> }
) {
  const { podcastId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const { error } = await createServerClient()
      .from('podcast_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('podcast_id', podcastId);

    if (error) throw error;

    return NextResponse.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

// PATCH: Update last_viewed_at (for badge logic)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ podcastId: string }> }
) {
  const { podcastId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const { error } = await createServerClient()
      .from('podcast_subscriptions')
      .update({ last_viewed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('podcast_id', podcastId);

    if (error) throw error;

    return NextResponse.json({ message: 'Updated last viewed' });
  } catch (error) {
    console.error('Error updating last viewed:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
