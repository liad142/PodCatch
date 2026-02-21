import { getAuthUser } from '@/lib/auth-helpers';
import { isAdminEmail } from '@/lib/admin';
import type { AnalyticsPeriod } from '@/types/analytics';

// ── Role-based access (server-only) ──
export type AnalyticsRole = 'admin' | 'user' | 'guest';

export async function getAnalyticsRole(): Promise<AnalyticsRole> {
  const user = await getAuthUser();
  if (!user) return 'guest';
  if (user.email && isAdminEmail(user.email)) return 'admin';
  return 'user';
}

// ── Period helpers (safe for both client/server, no server imports) ──
export function periodToDateFilter(period: AnalyticsPeriod): string | null {
  switch (period) {
    case '7d': return "NOW() - INTERVAL '7 days'";
    case '30d': return "NOW() - INTERVAL '30 days'";
    case '90d': return "NOW() - INTERVAL '90 days'";
    case 'all': return null;
  }
}

export function periodToDays(period: AnalyticsPeriod): number | null {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case 'all': return null;
  }
}

const VALID_PERIODS = new Set(['7d', '30d', '90d', 'all']);

export function parseAnalyticsPeriod(value: string | null): AnalyticsPeriod {
  if (value && VALID_PERIODS.has(value)) return value as AnalyticsPeriod;
  return '30d';
}
