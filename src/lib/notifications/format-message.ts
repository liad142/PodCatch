import { createAdminClient } from '@/lib/supabase/admin';
import type { ShareContent } from '@/types/notifications';
import type { QuickSummaryContent, InsightsContent } from '@/types/database';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Build share content from episode/summary/insights data.
 * Queries the DB for episode info, hook headline, and top highlights.
 */
export async function buildShareContent(episodeId: string): Promise<ShareContent> {
  const supabase = createAdminClient();

  // Fetch episode + podcast info
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('title, podcast_id')
    .eq('id', episodeId)
    .single();

  if (episodeError || !episode) {
    throw new Error(`Episode not found: ${episodeId}`);
  }

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('title, image_url')
    .eq('id', episode.podcast_id)
    .single();

  // Fetch quick summary for hook headline
  const { data: quickSummary } = await supabase
    .from('summaries')
    .select('content_json')
    .eq('episode_id', episodeId)
    .eq('level', 'quick')
    .eq('status', 'ready')
    .single();

  const quickContent = quickSummary?.content_json as QuickSummaryContent | null;
  const hookHeadline = quickContent?.hook_headline || episode.title;

  // Fetch insights for highlights
  const { data: insightsSummary } = await supabase
    .from('summaries')
    .select('content_json')
    .eq('episode_id', episodeId)
    .eq('level', 'insights')
    .eq('status', 'ready')
    .single();

  const insightsContent = insightsSummary?.content_json as InsightsContent | null;
  const highlights = (insightsContent?.highlights || [])
    .slice(0, 3)
    .map(h => h.quote);

  return {
    episodeTitle: episode.title,
    podcastName: podcast?.title || 'Unknown Podcast',
    podcastImageUrl: podcast?.image_url || null,
    hookHeadline,
    highlights,
    insightsUrl: `${APP_URL}/episode/${episodeId}/insights`,
  };
}

/**
 * Format share content as a WhatsApp message (plain text, URL-safe).
 */
export function formatWhatsAppMessage(content: ShareContent): string {
  const lines = [
    `\u{1F399} ${content.episodeTitle} - ${content.podcastName}`,
    '',
    `\u{1F4A1} ${content.hookHeadline}`,
  ];

  if (content.highlights.length > 0) {
    lines.push('', 'Key takeaways:');
    for (const h of content.highlights.slice(0, 2)) {
      lines.push(`\u2022 ${h}`);
    }
  }

  lines.push('', `Read full insights \u{1F447}`, content.insightsUrl);

  const message = lines.join('\n');
  // Truncate to ~1000 chars for WhatsApp URL safety
  const truncated = message.length > 1000 ? message.substring(0, 997) + '...' : message;
  return encodeURIComponent(truncated);
}

/**
 * Format share content as a Telegram message (MarkdownV2 format).
 */
export function formatTelegramMessage(content: ShareContent): string {
  const esc = escapeMarkdownV2;

  const lines = [
    `\u{1F399} *${esc(content.episodeTitle)}*`,
    esc(content.podcastName),
    '',
    `\u{1F4A1} *${esc(content.hookHeadline)}*`,
  ];

  if (content.highlights.length > 0) {
    lines.push('', 'Key highlights:');
    for (const h of content.highlights.slice(0, 3)) {
      lines.push(`\u2022 ${esc(h)}`);
    }
  }

  lines.push('', `\u{1F449} [Read full insights](${content.insightsUrl})`);

  return lines.join('\n');
}

/** Escape special characters for Telegram MarkdownV2 */
function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
