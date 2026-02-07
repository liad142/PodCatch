/**
 * Supabase client barrel exports.
 *
 * Backward-compatible re-exports so existing imports keep working:
 *   import { supabase } from '@/lib/supabase'           -> browser singleton
 *   import { createServerClient } from '@/lib/supabase'  -> admin client (service role)
 */

export { createClient } from './client';
export { createAdminClient } from './admin';

// NOTE: Do NOT re-export from './server' or './middleware' here.
// Those use `next/headers` and cannot be imported in client components.
// Import them directly: '@/lib/supabase/server' or '@/lib/supabase/middleware'.

// ---------- backward-compat aliases ----------

import { createClient } from './client';
import { createAdminClient } from './admin';

/**
 * @deprecated Use `createClient()` for browser usage or `createAdminClient()` for server admin.
 * Kept for backward compatibility with existing code that imports `supabase`.
 */
export const supabase = createClient();

/**
 * @deprecated Use `createAdminClient()` instead.
 * Kept for backward compatibility with existing code that imports `createServerClient`.
 */
export const createServerClient = createAdminClient;
