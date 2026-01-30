export interface ParsedTranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp?: string;
  isRTL?: boolean;
}

export interface SpeakerInfo {
  name: string;
  color: string;
  avatar: string;
  realName?: string; // User-provided actual name
}

export interface TranscriptSpeaker {
  id: string;
  episode_id: string;
  speaker_label: string; // "Speaker 1", "Unknown Speaker", etc.
  identified_name: string | null; // User-provided name
  color: string;
  created_at: string;
  updated_at: string;
}
