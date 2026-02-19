import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/discover';

  if (code) {
    // Capture cookies Supabase wants to set so we can apply them to the redirect response.
    // Using next/headers cookieStore.set() doesn't transfer to NextResponse.redirect()
    // because they are separate response objects.
    const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((cookie) => pendingCookies.push(cookie));
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    let redirectUrl = `${origin}/discover`;

    if (!error && data?.user) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single();

      redirectUrl = (!profile || !profile.onboarding_completed)
        ? `${origin}/onboarding`
        : `${origin}${next}`;
    }

    const response = NextResponse.redirect(redirectUrl);

    // Apply session cookies directly onto the redirect response
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });

    return response;
  }

  return NextResponse.redirect(`${origin}/discover`);
}
