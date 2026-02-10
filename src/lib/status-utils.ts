/**
 * Summary status priority ordering.
 * Higher number = higher priority status.
 * Used to pick the "best" status when multiple summary records exist.
 */
export const SUMMARY_STATUS_PRIORITY: Record<string, number> = {
  ready: 6,
  summarizing: 5,
  transcribing: 4,
  queued: 3,
  failed: 2,
  not_ready: 1,
};
