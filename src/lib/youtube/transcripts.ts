import { YoutubeTranscript } from 'youtube-transcript';

export interface YouTubeTranscriptResult {
  text: string;
  language: string;
}

/**
 * Fetch auto-generated or manual captions from a YouTube video.
 * Uses the youtube-transcript package which scrapes captions without API key.
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<YouTubeTranscriptResult | null> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);

    if (!segments || segments.length === 0) {
      return null;
    }

    // Join all segments into a single text, preserving natural flow
    const fullText = segments
      .map(seg => seg.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!fullText) return null;

    return {
      text: fullText,
      language: 'en', // youtube-transcript doesn't reliably report language
    };
  } catch (err) {
    console.error(`[YT_TRANSCRIPT] Failed to fetch transcript for ${videoId}:`, err);
    return null;
  }
}
