import type { Utterance } from './deepgram';

// Speaker information extracted by Agent A
export interface SpeakerInfo {
  id: number;
  name: string;
  role: 'host' | 'guest' | 'unknown';
}

// Topic block identified by Agent A
export interface TopicBlock {
  id: string;
  label: string;
  utterances: Utterance[];
  primarySpeaker: number;
  startTime: number;
  endTime: number;
}

// Output from Agent A (Analyst)
export interface AnalysisResult {
  speakers: SpeakerInfo[];
  topicBlocks: TopicBlock[];
}

// Speaker contribution in a block summary
export interface SpeakerContribution {
  speaker: string;
  contribution: string;
}

// Output from Agent B (Writer) - one per topic block
export interface BlockSummary {
  blockId: string;
  label: string;
  summary: string;
  keyPoints: string[];
  speakerContributions: SpeakerContribution[];
}

// Section in final summary
export interface FinalSection {
  title: string;
  summary: string;
  keyPoints: string[];
  speakers: string[];
}

// Output from Agent C (Editor) - final summary
export interface FinalSummary {
  tldr: string;
  speakers: SpeakerInfo[];
  sections: FinalSection[];
  keyTakeaways: string[];
  actionItems: string[];
  topics: string[];
}
