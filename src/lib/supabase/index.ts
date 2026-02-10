/**
 * Supabase client barrel exports.
 *
 * Usage:
 *   import { supabase } from '@/lib/supabase'        -> browser singleton
 *   import { createAdminClient } from '@/lib/supabase' -> admin client (service role)
 *
 * NOTE: Do NOT re-export from './server' or './middleware' here.
 * Those use `next/headers` and cannot be imported in client components.
 * Import them directly: '@/lib/supabase/server' or '@/lib/supabase/middleware'.
 */

export { createClient } from './client';
export { createAdminClient } from './admin';

import { createClient } from './client';

/**
 * @deprecated Use `createClient()` for browser usage or `createAdminClient()` for server admin.
 * Kept for backward compatibility with existing code that imports `supabase`.
 */
export const supabase = createClient();
