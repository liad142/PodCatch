import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth-helpers';
import { deleteCached } from '@/lib/cache';

// GET: Fetch current user's profile
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: profile, error } = await createAdminClient()
      .from('user_profiles')
      .select('id, display_name, email, preferred_genres, preferred_country, onboarding_completed, created_at')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ profile }, {
      headers: { 'Cache-Control': 'private, no-cache' },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PATCH: Update profile
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updates = await request.json();

    // Only allow updating specific fields
    const allowedFields = ['display_name', 'preferred_genres', 'preferred_country', 'onboarding_completed'];
    const filteredUpdates: Record<string, any> = {};

    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: profile, error } = await createAdminClient()
      .from('user_profiles')
      .update(filteredUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Invalidate personalized discovery cache when genres or country change
    if ('preferred_genres' in filteredUpdates || 'preferred_country' in filteredUpdates) {
      const country = profile?.preferred_country || 'us';
      await deleteCached(`personalized:${user.id}:${country}`);
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
