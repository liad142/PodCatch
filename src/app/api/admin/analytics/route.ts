import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCached, setCached } from '@/lib/cache';
import {
  getActiveUsers,
  getActiveUsersTrend,
  getTopEvents,
  getFeatureAdoption,
  getEngagementFunnel,
} from '@/lib/posthog-api';
import type { PostHogAnalytics } from '@/types/admin';

const CACHE_KEY = 'admin:posthog-analytics';
const CACHE_TTL = 1800; // 30 min

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

  if (!refresh) {
    const cached = await getCached<PostHogAnalytics>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
  }

  const admin = createAdminClient();

  // Parallel: PostHog queries + Supabase correlation queries
  const [
    dau,
    wau,
    mau,
    activeUsersTrend,
    topEvents,
    funnel,
    { count: totalRegistered },
    { count: completedOnboarding },
    { count: hasSubscribed },
    { data: playersData },
  ] = await Promise.all([
    getActiveUsers('day'),
    getActiveUsers('week'),
    getActiveUsers('month'),
    getActiveUsersTrend(30),
    getTopEvents(30),
    getEngagementFunnel(30),
    admin.from('user_profiles').select('*', { count: 'exact', head: true }),
    admin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('onboarding_completed', true),
    admin
      .from('podcast_subscriptions')
      .select('user_id', { count: 'exact', head: true }),
    admin.rpc('count_distinct_players').single(),
  ]).catch(async (err) => {
    // If the RPC doesn't exist yet, fall back to a simpler query
    console.error('Analytics query error, retrying without RPC:', err);
    return Promise.all([
      getActiveUsers('day'),
      getActiveUsers('week'),
      getActiveUsers('month'),
      getActiveUsersTrend(30),
      getTopEvents(30),
      getEngagementFunnel(30),
      admin.from('user_profiles').select('*', { count: 'exact', head: true }),
      admin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('onboarding_completed', true),
      admin
        .from('podcast_subscriptions')
        .select('user_id', { count: 'exact', head: true }),
      { data: null } as { data: unknown },
    ]);
  });

  // Feature adoption needs MAU for percentage calculation
  const featureAdoption = await getFeatureAdoption(30, mau);

  const totalReg = totalRegistered ?? 0;
  const onboarded = completedOnboarding ?? 0;
  const subscribed = hasSubscribed ?? 0;
  const played = typeof playersData === 'number' ? playersData : Number(playersData ?? 0);

  // Funnel with conversion percentages
  const funnelWithConversion = funnel.map((step, i) => ({
    ...step,
    conversionPct:
      i === 0 || funnel[0].count === 0
        ? 100
        : Math.round((step.count / funnel[0].count) * 100),
  }));

  const data: PostHogAnalytics = {
    dau,
    wau,
    mau,
    dauMauRatio: mau > 0 ? Math.round((dau / mau) * 100) : 0,
    activeUsersTrend,
    topEvents,
    featureAdoption: featureAdoption.slice(0, 20),
    funnel: funnelWithConversion,
    correlation: {
      totalRegistered: totalReg,
      completedOnboarding: onboarded,
      hasPlayed: played,
      hasSubscribed: subscribed,
      onboardingRate: totalReg > 0 ? Math.round((onboarded / totalReg) * 100) : 0,
      playRate: totalReg > 0 ? Math.round((played / totalReg) * 100) : 0,
      subscribeRate: totalReg > 0 ? Math.round((subscribed / totalReg) * 100) : 0,
    },
    lastUpdated: new Date().toISOString(),
  };

  await setCached(CACHE_KEY, data, CACHE_TTL);

  return NextResponse.json(data);
}
