import { createClient } from '@deepgram/sdk';
import type {
  DeepgramResponse,
  DiarizedTranscript,
  Utterance,
} from '@/types/deepgram';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

const DEEPGRAM_CONFIG = {
  model: 'whisper-large',
  language: 'he',
  diarize: true,
  utterances: true,
  smart_format: true,
  punctuate: true,
} as const;

function logWithTime(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[DEEPGRAM ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

function parseDeepgramResponse(response: DeepgramResponse): DiarizedTranscript {
  const utterances: Utterance[] = [];

  if (response.results.utterances) {
    for (const utt of response.results.utterances) {
      utterances.push({
        start: utt.start,
        end: utt.end,
        speaker: utt.speaker,
        text: utt.transcript,
        confidence: utt.confidence,
      });
    }
  }

  // Build full text from utterances
  const fullText = utterances.map(u => u.text).join(' ');

  // Count unique speakers
  const speakerSet = new Set(utterances.map(u => u.speaker));

  return {
    utterances,
    fullText,
    duration: response.metadata.duration,
    speakerCount: speakerSet.size,
  };
}

export async function transcribeFromUrl(audioUrl: string): Promise<DiarizedTranscript> {
  logWithTime('transcribeFromUrl started', { audioUrl: audioUrl.substring(0, 100) + '...' });

  const startTime = Date.now();

  try {
    logWithTime('Sending to Deepgram API...', DEEPGRAM_CONFIG);

    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      DEEPGRAM_CONFIG
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
