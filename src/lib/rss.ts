import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    feed: [
      "image",
      "language",  // Extract channel language
    ],
    item: [
      ["itunes:duration", "duration"],
      ["itunes:image", "itunesImage"],
      ["enclosure", "enclosure"],
      ["podcast:transcript", "podcastTranscript", { keepArray: true }],  // Can have multiple transcripts
    ],
  },
});

export interface ParsedPodcast {
  title: string;
  description: string | undefined;
  image_url: string | undefined;
  author: string | undefined;
  language: string | undefined;  // From RSS <language> tag (e.g., 'en', 'he', 'es')
}

export interface ParsedEpisode {
  title: string;
  description: string | undefined;
  audio_url: string;
  duration_seconds: number | undefined;
  published_at: string | undefined;
  transcript_url: string | undefined;  // From <podcast:transcript> tag
  transcript_language: string | undefined;  // Language from transcript tag or fallback to channel language
}

function parseDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined;

  // Handle HH:MM:SS or MM:SS format
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  // Handle seconds only
  const seconds = parseInt(duration);
  return isNaN(seconds) ? undefined : seconds;
}


/**
 * Normalize language code to 2-letter ISO 639-1 format
 * e.g., 'en-us' -> 'en', 'en-US' -> 'en', 'he' -> 'he'
 */
function normalizeLanguageCode(lang: string): string {
  const normalized = lang.toLowerCase().split(/[-_]/)[0];
  return normalized.length === 2 ? normalized : 'en';
}

// Transcript type from <podcast:transcript> tag
interface PodcastTranscriptTag {
  $?: {
    url?: string;
    type?: string;    // e.g., 'application/srt', 'text/vtt', 'text/plain', 'application/json'
    language?: string; // e.g., 'en', 'he'
    rel?: string;      // e.g., 'captions'
  };
}

// Preferred transcript types in order (text-based are best for us)
const TRANSCRIPT_TYPE_PRIORITY = [
  'text/plain',
  'text/vtt',
  'application/srt',
  'application/x-subrip',
  'text/html',
  'application/json',
];

/**
 * Extract the best transcript from <podcast:transcript> tags
 * Prefers text formats over JSON, and matches channel language if multiple exist
 */
function extractBestTranscript(
  transcripts: PodcastTranscriptTag[] | PodcastTranscriptTag | undefined,
  channelLanguage: string | undefined
): { url: string; language: string | undefined } | undefined {
  if (!transcripts) return undefined;

  // Normalize to array
  const transcriptArray = Array.isArray(transcripts) ? transcripts : [transcripts];
  
  // Filter valid transcripts with URLs
  const validTranscripts = transcriptArray
    .filter((t) => t.$?.url)
    .map((t) => {
      const attrs = t.$!;  // Safe: filtered above
      return {
        url: attrs.url!,
        type: attrs.type?.toLowerCase() || '',
        language: attrs.language ? normalizeLanguageCode(attrs.language) : undefined,
      };
    });

  if (validTranscripts.length === 0) return undefined;

  // Sort by priority: matching language first, then by type preference
  validTranscripts.sort((a, b) => {
    // Prefer transcripts matching channel language
    const aLangMatch = a.language === channelLanguage ? 0 : 1;
    const bLangMatch = b.language === channelLanguage ? 0 : 1;
    if (aLangMatch !== bLangMatch) return aLangMatch - bLangMatch;

    // Then by type priority
    const aTypeIndex = TRANSCRIPT_TYPE_PRIORITY.findIndex((t) => a.type.includes(t));
    const bTypeIndex = TRANSCRIPT_TYPE_PRIORITY.findIndex((t) => b.type.includes(t));
    const aPriority = aTypeIndex === -1 ? 999 : aTypeIndex;
    const bPriority = bTypeIndex === -1 ? 999 : bTypeIndex;
    return aPriority - bPriority;
  });

  const best = validTranscripts[0];
  return { url: best.url, language: best.language };
}

export async function fetchPodcastFeed(rssUrl: string): Promise<{
  podcast: ParsedPodcast;
  episodes: ParsedEpisode[];
}> {
  const feed = await parser.parseURL(rssUrl);

  // Extract channel language (e.g., 'en', 'en-us', 'he')
  // Normalize to 2-letter code
  const rawLanguage = (feed as any).language as string | undefined;
  const channelLanguage = rawLanguage ? normalizeLanguageCode(rawLanguage) : undefined;

  const podcast: ParsedPodcast = {
    title: feed.title || "Unknown Podcast",
    description: feed.description,
    image_url: feed.image?.url || (feed as any).itunes?.image,
    author: (feed as any).itunes?.author || (feed as any).creator,
    language: channelLanguage,
  };

  const episodes: ParsedEpisode[] = feed.items
    .filter((item) => item.enclosure?.url)
    .map((item) => {
      // Extract transcript info from <podcast:transcript> tags
      const transcriptInfo = extractBestTranscript(
        (item as any).podcastTranscript,
        channelLanguage
      );

      return {
        title: item.title || "Untitled Episode",
        description: item.contentSnippet || item.content,
        audio_url: item.enclosure!.url,
        duration_seconds: parseDuration((item as any).duration),
        published_at: item.pubDate,
        transcript_url: transcriptInfo?.url,
        transcript_language: transcriptInfo?.language || channelLanguage,
      };
    });

  return { podcast, episodes };
}
