import { createClient } from '@deepgram/sdk';
import type {
  DeepgramResponse,
  DiarizedTranscript,
  Utterance,
} from '@/types/deepgram';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

const isDev = process.env.NODE_ENV === 'development';

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) throw error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[Deepgram] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

import { createLogger } from "@/lib/logger";
const logWithTime = createLogger('DEEPGRAM');

// Audio file extensions that indicate direct URLs (no redirects needed)
const DIRECT_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.opus'];

/**
 * Check if URL appears to be a direct audio file (no tracking redirect needed)
 */
function isDirectAudioUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  // Check file extension
  if (DIRECT_AUDIO_EXTENSIONS.some(ext => urlLower.includes(ext))) {
    // Make sure it's not a tracking URL that contains the extension in the path
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    if (DIRECT_AUDIO_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
      return true;
    }
  }
  return false;
}

/**
 * Follow redirects to get the final audio URL
 * Many podcast URLs go through tracking services that Deepgram can't fetch
 * Optimized: skips redirect following for direct audio URLs and uses timeouts
 */
async function resolveAudioUrl(url: string, maxRedirects = 5): Promise<string> {
  // Skip redirect following for direct audio URLs (common case)
  if (isDirectAudioUrl(url)) {
    logWithTime('URL appears to be direct audio, skipping redirect resolution');
    return url;
  }

  let currentUrl = url;
  let redirectCount = 0;
  const REDIRECT_TIMEOUT = 3000; // 3 second timeout per redirect

  while (redirectCount < maxRedirects) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REDIRECT_TIMEOUT);
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual', // Don't auto-follow, we want to track
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      });

      // Check if it's a redirect (3xx status)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          logWithTime('Redirect without location header, using current URL');
          break;
        }

        // Handle relative URLs
        currentUrl = location.startsWith('http')
          ? location
          : new URL(location, currentUrl).toString();

        redirectCount++;
        logWithTime(`Following redirect ${redirectCount}`, { to: currentUrl.substring(0, 80) + '...' });

        // If we've resolved to a direct audio URL, stop here
        if (isDirectAudioUrl(currentUrl)) {
          logWithTime('Resolved to direct audio URL, stopping redirect chain');
          break;
        }
      } else {
        // Not a redirect, we're done
        break;
      }
    } catch (error) {
      // On timeout or error, use current URL and continue
      if (error instanceof Error && error.name === 'AbortError') {
        logWithTime('Redirect request timed out, using current URL');
      } else {
        logWithTime('Error resolving URL, using current', { error: String(error) });
      }
      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (redirectCount > 0) {
    logWithTime(`Resolved URL after ${redirectCount} redirects`, {
      original: url.substring(0, 60) + '...',
      resolved: currentUrl.substring(0, 60) + '...'
    });
  }

  return currentUrl;
}

function parseDeepgramResponse(response: DeepgramResponse): DiarizedTranscript {
  const utterances: Utterance[] = [];
  let fullText = '';

  // Try to get utterances first (preferred - has speaker diarization)
  if (response.results.utterances && response.results.utterances.length > 0) {
    for (const utt of response.results.utterances) {
      utterances.push({
        start: utt.start,
        end: utt.end,
        speaker: utt.speaker,
        text: utt.transcript,
        confidence: utt.confidence,
      });
    }
    fullText = utterances.map(u => u.text).join(' ');
  } 
  // Fallback: Get transcript from channels if no utterances
  else if (response.results.channels?.[0]?.alternatives?.[0]) {
    const channel = response.results.channels[0];
    const alternative = channel.alternatives[0];
    fullText = alternative.transcript || '';
    
    // Create a single utterance from the full transcript if we have words with timing
    if (alternative.words && alternative.words.length > 0) {
      // Group words by speaker for diarization
      let currentSpeaker = 0;
      let currentStart = alternative.words[0].start;
      let currentText: string[] = [];
      
      for (const word of alternative.words) {
        const wordSpeaker = word.speaker ?? 0;
        
        if (wordSpeaker !== currentSpeaker && currentText.length > 0) {
          // Save current utterance
          utterances.push({
            start: currentStart,
            end: word.start,
            speaker: currentSpeaker,
            text: currentText.join(' '),
            confidence: 0.9,
          });
          currentText = [];
          currentStart = word.start;
          currentSpeaker = wordSpeaker;
        }
        currentText.push(word.punctuated_word || word.word);
      }
      
      // Save last utterance
      if (currentText.length > 0) {
        const lastWord = alternative.words[alternative.words.length - 1];
        utterances.push({
          start: currentStart,
          end: lastWord.end,
          speaker: currentSpeaker,
          text: currentText.join(' '),
          confidence: 0.9,
        });
      }
    } else if (fullText) {
      // No word-level timing, create single utterance
      utterances.push({
        start: 0,
        end: response.metadata.duration,
        speaker: 0,
        text: fullText,
        confidence: 0.9,
      });
    }
  }

  // Count unique speakers
  const speakerSet = new Set(utterances.map(u => u.speaker));

  // Get detected language from first channel
  const detectedLanguage = (response.results.channels?.[0] as { detected_language?: string })?.detected_language;

  logWithTime('parseDeepgramResponse result', {
    hasUtterances: response.results.utterances?.length ?? 0,
    parsedUtterances: utterances.length,
    fullTextLength: fullText.length,
    detectedLanguage
  });

  return {
    utterances,
    fullText,
    duration: response.metadata.duration,
    speakerCount: speakerSet.size || 1,
    detectedLanguage,
  };
}

export async function transcribeFromUrl(
  audioUrl: string,
  language?: string // Optional: 'en', 'he', etc. If not provided, Deepgram auto-detects
): Promise<DiarizedTranscript> {
  logWithTime('transcribeFromUrl started', { 
    audioUrl: audioUrl.substring(0, 100) + '...',
    language: language || 'auto-detect'
  });

  const startTime = Date.now();

  try {
    // Step 1: Resolve any tracking redirects to get the final audio URL
    logWithTime('Resolving audio URL (following redirects)...');
    const resolvedUrl = await resolveAudioUrl(audioUrl);

    // Step 2: Configure Deepgram options
    // Using whisper-large for best multilingual transcription
    // Language comes from RSS feed - we trust it completely
    const config: Record<string, unknown> = {
      model: 'whisper-large',
      diarize: true,
      utterances: true,
      smart_format: true,
      punctuate: true,
      detect_language: false, // Language is known from RSS feed
    };
    
    // Always use the provided language (comes from podcast RSS feed)
    if (language) {
      config.language = language;
    } else {
      // Fallback to English if somehow no language provided
      config.language = 'en';
    }

    logWithTime('Sending to Deepgram API...', config);

    const { result, error } = await withRetry(() =>
      deepgram.listen.prerecorded.transcribeUrl(
        { url: resolvedUrl },
        config
      )
    );

    if (error) {
      throw new Error(`Deepgram API error: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    logWithTime('Deepgram transcription completed', {
      durationMs: duration,
      durationSec: (duration / 1000).toFixed(1),
      audioDuration: result.metadata?.duration,
      utteranceCount: result.results?.utterances?.length || 0,
      detectedLanguage: result.results?.channels?.[0]?.detected_language,
    });

    const transcript = parseDeepgramResponse(result as DeepgramResponse);

    logWithTime('Transcript parsed', {
      utteranceCount: transcript.utterances.length,
      speakerCount: transcript.speakerCount,
      fullTextLength: transcript.fullText.length,
    });

    return transcript;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWithTime('Deepgram transcription FAILED', { durationMs: duration, error: errorMsg });

    throw new (class extends Error {
      name = 'TranscriptionError';
    })(`Deepgram transcription failed: ${errorMsg}`);
  }
}

// Helper to format transcript with timestamps for legacy compatibility
export function formatTranscriptWithTimestamps(transcript: DiarizedTranscript): string {
  return transcript.utterances
    .map(u => {
      const mins = Math.floor(u.start / 60);
      const secs = Math.floor(u.start % 60);
      const timestamp = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      return `[${timestamp}] [Speaker ${u.speaker}] ${u.text}`;
    })
    .join('\n');
}

// Format transcript with identified speaker names
// Merges consecutive utterances from the same speaker into paragraphs
export function formatTranscriptWithSpeakerNames(transcript: DiarizedTranscript): string {
  const speakerMap = new Map<number, string>();
  
  // Build speaker name map
  if (transcript.speakers) {
    for (const speaker of transcript.speakers) {
      speakerMap.set(speaker.id, speaker.name);
    }
  }

  if (transcript.utterances.length === 0) {
    return '';
  }

  // Merge consecutive utterances from the same speaker
  // Only split when: speaker changes OR there's a gap > 5 seconds
  const MAX_GAP_SECONDS = 5;
  const mergedBlocks: { speaker: number; start: number; texts: string[] }[] = [];
  
  let currentBlock: { speaker: number; start: number; texts: string[] } | null = null;
  let lastEnd = 0;

  for (const u of transcript.utterances) {
    const gap = u.start - lastEnd;
    const shouldStartNewBlock = 
      !currentBlock || 
      currentBlock.speaker !== u.speaker ||
      gap > MAX_GAP_SECONDS;

    if (shouldStartNewBlock) {
      if (currentBlock) {
        mergedBlocks.push(currentBlock);
      }
      currentBlock = {
        speaker: u.speaker,
        start: u.start,
        texts: [u.text]
      };
    } else if (currentBlock) {
      currentBlock.texts.push(u.text);
    }
    
    lastEnd = u.end;
  }

  // Don't forget the last block
  if (currentBlock) {
    mergedBlocks.push(currentBlock);
  }

  // Format merged blocks
  return mergedBlocks
    .map(block => {
      const mins = Math.floor(block.start / 60);
      const secs = Math.floor(block.start % 60);
      const timestamp = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const speakerName = speakerMap.get(block.speaker) || `Speaker ${block.speaker}`;
      const fullText = block.texts.join(' ');
      return `[${timestamp}] [${speakerName}] ${fullText}`;
    })
    .join('\n');
}
