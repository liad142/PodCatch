import { formatTelegramMessage } from './format-message';
import type { ShareContent } from '@/types/notifications';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Send a Telegram message via the Bot API.
 */
export async function sendTelegramMessage(
  chatId: string,
  content: ShareContent
): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  const text = formatTelegramMessage(content);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description || 'Telegram API error' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Telegram send failed';
    return { success: false, error: message };
  }
}
