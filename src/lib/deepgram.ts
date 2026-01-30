import { createClient } from '@deepgram/sdk';
import type {
  DeepgramResponse,
  DiarizedTranscript,
  Utterance,
} from '@/types/deepgram';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

function logWithTime(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[DEEPGRAM ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

/**
 * Follow redirects to get the final audio URL
 * Many podcast URLs go through tracking services that Deepgram can't fetch
 */
async function resolveAudioUrl(url: string, maxRedirects = 10): Promise<string> {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual', // Don't auto-follow, we want to track
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
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
      } else {
        // Not a redirect, we're done
        break;
      }
    } catch (error) {
      logWithTime('Error resolving URL, using original', { error: String(error) });
      break;
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
    // - Supports 50+ languages with auto-detection
    // - detect_language=true ensures transcription in ORIGINAL language (no translation)
    // - Good speaker diarization
    // Future: Could add logic to choose model based on detected language
    const config: Record<string, unknown> = {
      model: 'whisper-large',
      diarize: true,
      utterances: true,
      smart_format: true,
      punctuate: true,
      detect_language: true, // IMPORTANT: Keeps original language, prevents translation to English
    };
    
    // If language is explicitly provided, use it and disable auto-detection
    if (language) {
      config.language = language;
      config.detect_language = false;
    }

    logWithTime('Sending to Deepgram API...', config);

    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: resolvedUrl },
      config
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
    } else {
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
