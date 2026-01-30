// Deepgram API response types for Whisper transcription with diarization

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number;
  speaker_confidence: number;
  punctuated_word: string;
}

export interface DeepgramUtterance {
  start: number;
  end: number;
  confidence: number;
  channel: number;
  transcript: string;
  words: DeepgramWord[];
  speaker: number;
  id: string;
}

export interface DeepgramChannel {
  alternatives: Array<{
    transcript: string;
    confidence: number;
    words: DeepgramWord[];
  }>;
}

export interface DeepgramMetadata {
  transaction_key: string;
  request_id: string;
  sha256: string;
  created: string;
  duration: number;
  channels: number;
  models: string[];
  model_info: Record<string, { name: string; version: string; arch: string }>;
}

export interface DeepgramResponse {
  metadata: DeepgramMetadata;
  results: {
    channels: DeepgramChannel[];
    utterances?: DeepgramUtterance[];
  };
}

// Transformed types for our application
export interface Utterance {
  start: number;
  end: number;
  speaker: number;
  text: string;
  confidence: number;
}

export interface DiarizedTranscript {
  utterances: Utterance[];
  fullText: string;
  duration: number;
  speakerCount: number;
}

// Error type
export class TranscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptionError';
  }
}
