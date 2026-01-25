import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with secret key for admin operations
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;

  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is required for server operations');
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
