# Transcription & Summarization Refactor Design

**Date:** 2026-01-30
**Status:** Approved

## Overview

Refactor the transcription and summarization services to improve quality and architecture:
1. Switch from Groq+FFmpeg to Deepgram Whisper Cloud for transcription
2. Implement sub-agent workflow with Claude Sonnet 4.5 for summarization
3. Clean removal of all legacy code

## 1. Deepgram Transcription Service

### New File: `src/lib/deepgram.ts`

**Configuration:**
```typescript
const DEEPGRAM_CONFIG = {
  model: 'whisper-large',
  language: 'he',
  diarize: true,
  utterances: true,
  smart_format: true,
  punctuate: true
};
```

**Key Function:**
```typescript
async function transcribeFromUrl(audioUrl: string): Promise<DiarizedTranscript>
```

**Response Types:**
```typescript
interface DiarizedTranscript {
  utterances: Utterance[];
  fullText: string;
  duration: number;
  speakers: Map<number, string>;
}

interface Utterance {
  start: number;
  end: number;
  speaker: number;
  text: string;
  confidence: number;
}
```

No chunking needed - Deepgram handles large files natively via URL.

## 2. Sub-Agent Summarization Architecture

### New File: `src/lib/summary-agents.ts`

Three agents using Claude Sonnet 4.5:

### Agent A - The Analyst
```typescript
async function analyzeTranscript(transcript: DiarizedTranscript): Promise<AnalysisResult>
```

**Responsibilities:**
1. Extract speaker names from conversation patterns ("Hi John", "I'm Sarah")
2. Identify topic shifts and group utterances into Topic Blocks
3. Label each block (e.g., "Introduction", "AI Discussion")

**Output:**
```typescript
interface AnalysisResult {
  speakers: SpeakerInfo[];        // { id: 0, name: "John", role: "Host" }
  topicBlocks: TopicBlock[];
}

interface TopicBlock {
  id: string;
  label: string;
  utterances: Utterance[];
  primarySpeaker: number;
  startTime: number;
  endTime: number;
}
```

### Agent B - The Writer (Parallel Execution)
```typescript
async function summarizeBlock(block: TopicBlock, speakers: SpeakerInfo[]): Promise<BlockSummary>
```

**Responsibilities:**
- Deep summarize each Topic Block with speaker attribution
- Extract key points per block
- Track speaker contributions

**Output:**
```typescript
interface BlockSummary {
  blockId: string;
  label: string;
  summary: string;                // "John (Host) introduced..."
  keyPoints: string[];
  speakerContributions: { speaker: string; contribution: string }[];
}
```

**Parallel Execution:**
```typescript
const blockSummaries = await Promise.all(
  topicBlocks.map(block => summarizeBlock(block, speakers))
);
```

### Agent C - The Editor
```typescript
async function synthesizeFinalSummary(
  blockSummaries: BlockSummary[],
  speakers: SpeakerInfo[]
): Promise<FinalSummary>
```

**Responsibilities:**
- Synthesize block summaries into cohesive final output
- Generate TLDR, key takeaways, action items
- Maintain speaker attribution throughout

**Output:**
```typescript
interface FinalSummary {
  tldr: string;
  speakers: SpeakerInfo[];
  sections: Section[];
  keyTakeaways: string[];
  actionItems: string[];
}
```

## 3. Integration & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      requestSummary()                            │
├─────────────────────────────────────────────────────────────────┤
│  1. ensureTranscript(episodeId, audioUrl)                       │
│     └── deepgram.transcribeFromUrl(audioUrl)                    │
│         └── Returns: DiarizedTranscript                         │
│                                                                  │
│  2. Agent A: analyzeTranscript(transcript)                      │
│     └── Returns: { speakers, topicBlocks }                      │
│                                                                  │
│  3. Agent B: Promise.all(blocks.map(summarizeBlock))  [PARALLEL]│
│     └── Returns: BlockSummary[]                                 │
│                                                                  │
│  4. Agent C: synthesizeFinalSummary(blockSummaries, speakers)   │
│     └── Returns: FinalSummary                                   │
│                                                                  │
│  5. Store in Supabase → Return to client                        │
└─────────────────────────────────────────────────────────────────┘
```

**Status Progression (unchanged for client compatibility):**
```
queued → transcribing → summarizing → ready
```

## 4. Cleanup Scope

### Files to DELETE:
- `src/lib/groq.ts` - Groq transcription + FFmpeg chunking
- `src/types/ffmpeg-static.d.ts` - FFmpeg type declaration

### Packages to REMOVE:
- `groq-sdk`
- `ffmpeg-static`
- `fluent-ffmpeg`
- `@types/fluent-ffmpeg` (if exists)

### Files to CREATE:
- `src/lib/deepgram.ts` - New transcription service
- `src/lib/summary-agents.ts` - Sub-agent workflow
- `src/types/deepgram.ts` - Deepgram response types

### Files to MODIFY:
- `src/lib/summary-service.ts` - Use new deepgram + agents
- `src/lib/insights-service.ts` - Update transcript parsing
- `.env.example` - Add DEEPGRAM_API_KEY, remove GROQ_API_KEY

### Environment Variables:
```diff
- GROQ_API_KEY=xxx
+ DEEPGRAM_API_KEY=xxx
```

## 5. Error Handling

**Fail-fast approach:**
- No retries, no fallbacks
- If Deepgram fails → throw TranscriptionError
- If any Agent fails → pipeline fails immediately
- User can retry via UI

## 6. Speaker Identification Strategy

1. Scan transcript for name patterns:
   - Self-introductions: "I'm John Smith and this is..."
   - Greetings: "Hi Sarah, thanks for joining"
   - References: "So John, what's your take on..."
2. Map names to speaker IDs based on who said/received them
3. Fallback hierarchy: Real Name → "Host"/"Guest" → "Speaker A"/"Speaker B"

## 7. Type Safety

### New File: `src/types/deepgram.ts`
```typescript
interface DeepgramResponse {
  results: {
    utterances: DeepgramUtterance[];
    channels: DeepgramChannel[];
  };
  metadata: {
    duration: number;
    request_id: string;
  };
}

interface DeepgramUtterance {
  start: number;
  end: number;
  speaker: number;
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
}
```
