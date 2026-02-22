import { createLogger } from "@/lib/logger";

const logWithTime = createLogger('APPLE-TRANSCRIPTS');

const APPLE_BEARER_TOKEN = process.env.APPLE_PODCASTS_BEARER_TOKEN;

// Pre-compiled regex for TTML parsing
const TTML_TAG_RE = /<[^>]+>/g;
const MULTI_SPACE_RE = /\s+/g;
const TTML_P_RE = /<p[^>]*>([\s\S]*?)<\/p>/gi;
const TTML_SPAN_RE = /<span[^>]*podcasts:unit="word"[^>]*>([\s\S]*?)<\/span>/gi;
const TTML_SPAN_FALLBACK_RE = /<span[^>]*>([\s\S]*?)<\/span>/gi;
const TTML_BEGIN_RE = /begin="([^"]+)"/;
const TTML_AGENT_RE = /ttm:agent="([^"]+)"/;

interface AppleSearchResult {
  trackId: number;
  trackName: string;
  collectionName: string;
  artistName: string;
}

/**
 * Search the iTunes Search API for a podcast episode by title.
 * This is a FREE public API, no auth needed.
 * Returns the Apple episode trackId or null if not found.
 */
export async function searchAppleEpisode(
  podcastTitle: string,
  episodeTitle: string
): Promise<number | null> {
  // Combine podcast + episode title for better matching
  const searchTerm = `${podcastTitle} ${episodeTitle}`.substring(0, 200);

  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', searchTerm);
  url.searchParams.set('entity', 'podcastEpisode');
  url.searchParams.set('limit', '5');

  logWithTime('Searching iTunes API for episode', {
    podcastTitle: podcastTitle.substring(0, 50),
    episodeTitle: episodeTitle.substring(0, 50),
  });

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'PodCatch/1.0' },
    });

    if (!response.ok) {
      logWithTime('iTunes search failed', { status: response.status });
      return null;
    }

    const data = await response.json();
    const results: AppleSearchResult[] = data.results || [];

    if (results.length === 0) {
      logWithTime('No iTunes results found');
      return null;
    }

    // Find best match by title similarity
    const match = findBestMatch(results, podcastTitle, episodeTitle);
    if (match) {
      logWithTime('Found Apple episode match', {
        trackId: match.trackId,
        trackName: match.trackName.substring(0, 60),
      });
      return match.trackId;
    }

    logWithTime('No suitable match found in iTunes results');
    return null;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWithTime('iTunes search error', { error: errorMsg });
    return null;
  }
}

/**
 * Find the best matching episode from iTunes results.
 * Uses simple title similarity (normalized Jaccard-like comparison).
 */
function findBestMatch(
  results: AppleSearchResult[],
  podcastTitle: string,
  episodeTitle: string
): AppleSearchResult | null {
  const normalizedEpTitle = normalize(episodeTitle);

  let bestMatch: AppleSearchResult | null = null;
  let bestScore = 0;

  for (const result of results) {
    const normalizedResult = normalize(result.trackName);

    // Calculate word overlap score
    const score = wordOverlapScore(normalizedEpTitle, normalizedResult);

    // Bonus if podcast name matches
    const podcastScore = wordOverlapScore(
      normalize(podcastTitle),
      normalize(result.collectionName || result.artistName)
    );

    const combinedScore = score * 0.7 + podcastScore * 0.3;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMatch = result;
    }
  }

  // Require minimum 30% overlap to accept a match
  return bestScore >= 0.3 ? bestMatch : null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(MULTI_SPACE_RE, ' ')
    .trim();
}

function wordOverlapScore(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter(w => w.length > 1));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  // Jaccard-like: overlap / union
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? overlap / union : 0;
}

/**
 * Fetch a transcript from Apple Podcasts using the bearer token.
 * The Apple Podcasts transcript API returns TTML (Timed Text Markup Language).
 *
 * API endpoint: /v1/catalog/us/podcast-episodes/{id}/transcripts
 * Response: { data: [{ attributes: { ttmlAssetUrls: { ttml: "signed CDN URL" } } }] }
 */
export async function fetchAppleTranscript(
  appleEpisodeId: number
): Promise<string | null> {
  if (!APPLE_BEARER_TOKEN) {
    logWithTime('No Apple bearer token configured, skipping');
    return null;
  }

  const url = `https://amp-api.podcasts.apple.com/v1/catalog/us/podcast-episodes/${appleEpisodeId}/transcripts?fields=ttmlToken,ttmlAssetUrls&l=en-US&with=entitlements`;

  logWithTime('Fetching Apple transcript metadata', { episodeId: appleEpisodeId });

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'Authorization': `Bearer ${APPLE_BEARER_TOKEN}`,
        'Origin': 'https://podcasts.apple.com',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (response.status === 401 || response.status === 403) {
      logWithTime('Apple bearer token expired or invalid', { status: response.status });
      return null;
    }

    if (response.status === 404) {
      logWithTime('No transcript available for this Apple episode');
      return null;
    }

    if (!response.ok) {
      logWithTime('Apple transcript API error', { status: response.status });
      return null;
    }

    const data = await response.json();
    const attrs = data?.data?.[0]?.attributes;

    // Get the signed TTML CDN URL from ttmlAssetUrls.ttml
    const ttmlUrl = attrs?.ttmlAssetUrls?.ttml;

    if (!ttmlUrl) {
      logWithTime('No TTML URL in Apple response', {
        hasData: !!data?.data?.length,
        hasAttrs: !!attrs,
        keys: attrs ? Object.keys(attrs) : [],
      });
      return null;
    }

    logWithTime('Got TTML URL, fetching transcript...', { urlLength: ttmlUrl.length });

    // Fetch the actual TTML file from Apple's CDN
    const ttmlResponse = await fetch(ttmlUrl, {
      signal: AbortSignal.timeout(30000), // 30s for large transcripts
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!ttmlResponse.ok) {
      logWithTime('Failed to fetch TTML file', { status: ttmlResponse.status });
      return null;
    }

    const ttml = await ttmlResponse.text();
    const parsed = parseTtmlToText(ttml);

    if (parsed && parsed.length > 100) {
      logWithTime('Apple transcript fetched and parsed', {
        ttmlLength: ttml.length,
        parsedLength: parsed.length,
      });
      return parsed;
    }

    logWithTime('Parsed Apple transcript too short', { length: parsed?.length });
    return null;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWithTime('Apple transcript fetch error', { error: errorMsg });
    return null;
  }
}

/**
 * Parse Apple TTML (Timed Text Markup Language) to plain text with timestamps and speakers.
 *
 * Apple's TTML format:
 * <p begin="1.980" end="3.960" ttm:agent="SPEAKER_1">
 *   <span podcasts:unit="sentence">
 *     <span podcasts:unit="word">Joe</span>
 *     <span podcasts:unit="word">Rogan</span>
 *   </span>
 * </p>
 */
export function parseTtmlToText(ttml: string): string {
  const paragraphs: { begin: string | null; speaker: string | null; text: string }[] = [];

  let pMatch;
  TTML_P_RE.lastIndex = 0;
  while ((pMatch = TTML_P_RE.exec(ttml)) !== null) {
    const pTag = pMatch[0];
    const pContent = pMatch[1];

    // Extract begin timestamp and speaker from the <p> tag
    const beginMatch = pTag.match(TTML_BEGIN_RE);
    const begin = beginMatch ? beginMatch[1] : null;
    const agentMatch = pTag.match(TTML_AGENT_RE);
    const speaker = agentMatch ? agentMatch[1] : null;

    // Extract word-level spans (Apple uses podcasts:unit="word")
    let text = '';
    let spanMatch;
    TTML_SPAN_RE.lastIndex = 0;
    const words: string[] = [];
    while ((spanMatch = TTML_SPAN_RE.exec(pContent)) !== null) {
      const word = spanMatch[1].replace(TTML_TAG_RE, '').trim();
      if (word) words.push(word);
    }

    if (words.length > 0) {
      text = words.join(' ');
    } else {
      // Fallback: try any span
      TTML_SPAN_FALLBACK_RE.lastIndex = 0;
      const spans: string[] = [];
      while ((spanMatch = TTML_SPAN_FALLBACK_RE.exec(pContent)) !== null) {
        const spanText = spanMatch[1].replace(TTML_TAG_RE, '').trim();
        if (spanText) spans.push(spanText);
      }
      text = spans.length > 0 ? spans.join(' ') : pContent.replace(TTML_TAG_RE, '').trim();
    }

    if (text) {
      paragraphs.push({ begin, speaker, text });
    }
  }

  if (paragraphs.length > 0) {
    // Merge consecutive paragraphs from the same speaker into blocks
    const blocks: { begin: string | null; speaker: string | null; texts: string[] }[] = [];
    let current: typeof blocks[0] | null = null;

    for (const p of paragraphs) {
      if (current && current.speaker === p.speaker) {
        current.texts.push(p.text);
      } else {
        if (current) blocks.push(current);
        current = { begin: p.begin, speaker: p.speaker, texts: [p.text] };
      }
    }
    if (current) blocks.push(current);

    return blocks
      .map(b => {
        const parts: string[] = [];
        if (b.begin) parts.push(`[${formatTtmlTimestamp(b.begin)}]`);
        if (b.speaker) parts.push(`[${b.speaker}]`);
        parts.push(b.texts.join(' '));
        return parts.join(' ');
      })
      .join('\n');
  }

  // Fallback: strip all XML tags
  return ttml
    .replace(TTML_TAG_RE, ' ')
    .replace(MULTI_SPACE_RE, ' ')
    .trim();
}

/**
 * Convert TTML timestamp format (HH:MM:SS.mmm or MM:SS.mmm) to MM:SS
 */
function formatTtmlTimestamp(timestamp: string): string {
  // Handle HH:MM:SS.mmm format
  const parts = timestamp.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0]);
    const mins = parseInt(parts[1]);
    const secs = parseFloat(parts[2]);
    const totalMins = hours * 60 + mins;
    return `${totalMins.toString().padStart(2, '0')}:${Math.floor(secs).toString().padStart(2, '0')}`;
  }
  if (parts.length === 2) {
    const mins = parseInt(parts[0]);
    const secs = parseFloat(parts[1]);
    return `${mins.toString().padStart(2, '0')}:${Math.floor(secs).toString().padStart(2, '0')}`;
  }
  return '00:00';
}

/**
 * Full pipeline: search for the episode on Apple, then fetch its transcript.
 * Returns the transcript text or null if unavailable.
 */
export async function getAppleTranscript(
  podcastTitle: string,
  episodeTitle: string
): Promise<{ text: string; provider: 'apple-podcasts' } | null> {
  if (!APPLE_BEARER_TOKEN) {
    return null;
  }

  const appleId = await searchAppleEpisode(podcastTitle, episodeTitle);
  if (!appleId) {
    return null;
  }

  const text = await fetchAppleTranscript(appleId);
  if (!text) {
    return null;
  }

  return { text, provider: 'apple-podcasts' };
}
