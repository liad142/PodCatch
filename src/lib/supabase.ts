import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client (singleton)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client singleton for connection pooling
// Using a module-level variable ensures we reuse the same client across requests
let serverClientInstance: SupabaseClient | null = null;

/**
 * Get or create a singleton server-side Supabase client.
 * This reuses connections across requests for better performance.
 */
export function createServerClient(): SupabaseClient {
  if (serverClientInstance) {
    return serverClientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;

  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is required for server operations');
  }

  serverClientInstance = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return serverClientInstance;
}
