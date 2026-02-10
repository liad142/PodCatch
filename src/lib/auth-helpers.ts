import { createAuthServerClient } from '@/lib/supabase/server';

/**
 * Get the authenticated user from the request cookies.
 * Returns null if not authenticated.
 */
export async function getAuthUser() {
  const supabase = await createAuthServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[AUTH] getAuthUser failed:', error.message);
  }
  return user;
}
