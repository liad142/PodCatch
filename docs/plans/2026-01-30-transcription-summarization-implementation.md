# Transcription & Summarization Refactor - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Groq+FFmpeg transcription with Deepgram Whisper Cloud and implement sub-agent summarization workflow with Claude Sonnet 4.5.

**Architecture:** Deepgram handles transcription with diarization. Three Claude agents (Analyst → Writer → Editor) process the transcript in a map-reduce pattern with parallel execution for topic block summarization.

**Tech Stack:** Deepgram SDK, Anthropic SDK (Claude Sonnet 4.5), TypeScript, Supabase

---

## Task 1: Install Deepgram SDK

**Files:**
- Modify: `package.json`

**Step 1: Install @deepgram/sdk**

Run:
```bash
npm install @deepgram/sdk
```

**Step 2: Verify installation**

Run:
```bash
npm list @deepgram/sdk
```
Expected: Shows @deepgram/sdk version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @deepgram/sdk dependency"
```

---

## Task 2: Create Deepgram Types

**Files:**
- Create: `src/types/deepgram.ts`

**Step 1: Create the types file**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/types/deepgram.ts
git commit -m "feat: add Deepgram response types"
```

---

## Task 3: Create Deepgram Transcription Service

**Files:**
- Create: `src/lib/deepgram.ts`

**Step 1: Create the service file**

```typescript
import { createClient } from '@deepgram/sdk';
import type {
  DeepgramResponse,
  DiarizedTranscript,
  Utterance,
  TranscriptionError
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
```

**Step 2: Commit**

```bash
git add src/lib/deepgram.ts
git commit -m "feat: add Deepgram transcription service"
```

---

## Task 4: Create Sub-Agent Types

**Files:**
- Create: `src/types/summary-agents.ts`

**Step 1: Create the types file**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/types/summary-agents.ts
git commit -m "feat: add sub-agent workflow types"
```

---

## Task 5: Create Sub-Agent Service - Agent A (Analyst)

**Files:**
- Create: `src/lib/summary-agents.ts`

**Step 1: Create the service with Agent A**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { DiarizedTranscript, Utterance } from '@/types/deepgram';
import type {
  SpeakerInfo,
  TopicBlock,
  AnalysisResult,
  BlockSummary,
  FinalSummary,
  FinalSection,
} from '@/types/summary-agents';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-5-20250514';

function logWithTime(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[SUMMARY-AGENTS ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

// ============================================
// AGENT A: THE ANALYST
// ============================================

const AGENT_A_SYSTEM = `You are an expert podcast analyst. Your job is to:
1. Identify speakers by analyzing conversation patterns (introductions, greetings, name references)
2. Group the transcript into logical topic blocks based on subject matter changes
3. Label each block with a descriptive title

Respond ONLY with valid JSON. No markdown, no explanations.`;

const AGENT_A_PROMPT = `Analyze this diarized podcast transcript and return a JSON object with this structure:

{
  "speakers": [
    { "id": 0, "name": "John Smith", "role": "host" },
    { "id": 1, "name": "Sarah Johnson", "role": "guest" }
  ],
  "topicBlocks": [
    {
      "id": "block-1",
      "label": "Introduction and Welcome",
      "utteranceIndices": [0, 1, 2, 3],
      "primarySpeaker": 0
    }
  ]
}

RULES:
- For speakers: Extract real names from the conversation if mentioned ("Hi John", "I'm Sarah", etc.)
- If no name found, use "Host", "Guest 1", "Guest 2" based on speaking patterns
- Role is "host" for the person who welcomes/guides, "guest" for interviewees, "unknown" otherwise
- For topicBlocks: Group consecutive utterances that discuss the same topic
- Create 3-10 blocks depending on episode length and topic diversity
- utteranceIndices is an array of indices into the utterances array
- primarySpeaker is the speaker ID who talks most in that block
- Labels should be descriptive: "Discussion: AI in Healthcare", "Personal Story: Career Journey"
- IMPORTANT: Respond in the SAME LANGUAGE as the transcript

Transcript (format: [index] Speaker X: text):
`;

export async function analyzeTranscript(transcript: DiarizedTranscript): Promise<AnalysisResult> {
  logWithTime('Agent A (Analyst) starting', {
    utteranceCount: transcript.utterances.length,
    speakerCount: transcript.speakerCount
  });

  const startTime = Date.now();

  // Format transcript for the prompt
  const formattedTranscript = transcript.utterances
    .map((u, i) => `[${i}] Speaker ${u.speaker}: ${u.text}`)
    .join('\n');

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: AGENT_A_SYSTEM,
      messages: [{
        role: 'user',
        content: AGENT_A_PROMPT + formattedTranscript
      }]
    });

    const textContent = message.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Agent A');
    }

    // Extract JSON from response
    let jsonText = textContent.text.trim();
    if (!jsonText.startsWith('{')) {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) jsonText = match[0];
      else throw new Error('No JSON found in Agent A response');
    }

    const parsed = JSON.parse(jsonText);

    // Transform to our types
    const speakers: SpeakerInfo[] = parsed.speakers.map((s: { id: number; name: string; role: string }) => ({
      id: s.id,
      name: s.name || `Speaker ${s.id}`,
      role: (['host', 'guest', 'unknown'].includes(s.role) ? s.role : 'unknown') as SpeakerInfo['role'],
    }));

    const topicBlocks: TopicBlock[] = parsed.topicBlocks.map((block: {
      id: string;
      label: string;
      utteranceIndices: number[];
      primarySpeaker: number
    }) => {
      const blockUtterances = block.utteranceIndices
        .map((idx: number) => transcript.utterances[idx])
        .filter(Boolean);

      return {
        id: block.id,
        label: block.label,
        utterances: blockUtterances,
        primarySpeaker: block.primarySpeaker,
        startTime: blockUtterances[0]?.start || 0,
        endTime: blockUtterances[blockUtterances.length - 1]?.end || 0,
      };
    });

    const duration = Date.now() - startTime;
    logWithTime('Agent A completed', {
      durationMs: duration,
      speakersFound: speakers.length,
      blocksCreated: topicBlocks.length,
    });

    return { speakers, topicBlocks };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWithTime('Agent A FAILED', { durationMs: duration, error: errorMsg });
    throw new Error(`Agent A (Analyst) failed: ${errorMsg}`);
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/summary-agents.ts
git commit -m "feat: add Agent A (Analyst) for transcript analysis"
```

---

## Task 6: Add Agent B (Writer) to Sub-Agent Service

**Files:**
- Modify: `src/lib/summary-agents.ts`

**Step 1: Add Agent B after Agent A**

Add the following code after the `analyzeTranscript` function:

```typescript
// ============================================
// AGENT B: THE WRITER (runs in parallel)
// ============================================

const AGENT_B_SYSTEM = `You are an expert content summarizer. Your job is to create a detailed summary of a specific topic block from a podcast, with speaker attribution.

Respond ONLY with valid JSON. No markdown, no explanations.`;

const AGENT_B_PROMPT = `Summarize this topic block from a podcast transcript.

Speaker mapping:
{SPEAKERS}

Topic Block: "{LABEL}"
Duration: {START_TIME} - {END_TIME}

Return a JSON object:
{
  "summary": "2-4 sentences summarizing this block. Use speaker names, e.g. 'John (Host) explained that...'",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "speakerContributions": [
    { "speaker": "John (Host)", "contribution": "What this speaker contributed to the discussion" }
  ]
}

RULES:
- Use speaker names with roles in parentheses: "John (Host)", "Sarah (Guest)"
- Key points should be specific and actionable, not generic
- Each speaker who talked significantly should have a contribution entry
- IMPORTANT: Write in the SAME LANGUAGE as the transcript

Transcript:
`;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export async function summarizeBlock(
  block: TopicBlock,
  speakers: SpeakerInfo[]
): Promise<BlockSummary> {
  logWithTime('Agent B (Writer) starting', { blockId: block.id, label: block.label });

  const startTime = Date.now();

  // Format speakers for prompt
  const speakerMap = speakers
    .map(s => `Speaker ${s.id} = ${s.name} (${s.role})`)
    .join('\n');

  // Format utterances
  const transcriptText = block.utterances
    .map(u => {
      const speaker = speakers.find(s => s.id === u.speaker);
      const name = speaker ? `${speaker.name} (${speaker.role})` : `Speaker ${u.speaker}`;
      return `${name}: ${u.text}`;
    })
    .join('\n');

  const prompt = AGENT_B_PROMPT
    .replace('{SPEAKERS}', speakerMap)
    .replace('{LABEL}', block.label)
    .replace('{START_TIME}', formatTime(block.startTime))
    .replace('{END_TIME}', formatTime(block.endTime))
    + transcriptText;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: AGENT_B_SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = message.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Agent B');
    }

    let jsonText = textContent.text.trim();
    if (!jsonText.startsWith('{')) {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) jsonText = match[0];
      else throw new Error('No JSON found in Agent B response');
    }

    const parsed = JSON.parse(jsonText);

    const duration = Date.now() - startTime;
    logWithTime('Agent B completed', { blockId: block.id, durationMs: duration });

    return {
      blockId: block.id,
      label: block.label,
      summary: parsed.summary || '',
      keyPoints: parsed.keyPoints || [],
      speakerContributions: parsed.speakerContributions || [],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWithTime('Agent B FAILED', { blockId: block.id, durationMs: duration, error: errorMsg });
    throw new Error(`Agent B (Writer) failed for block ${block.id}: ${errorMsg}`);
  }
}

// Parallel execution of Agent B for all blocks
export async function summarizeAllBlocks(
  blocks: TopicBlock[],
  speakers: SpeakerInfo[]
): Promise<BlockSummary[]> {
  logWithTime('Starting parallel block summarization', { blockCount: blocks.length });

  const startTime = Date.now();

  const summaries = await Promise.all(
    blocks.map(block => summarizeBlock(block, speakers))
  );

  const duration = Date.now() - startTime;
  logWithTime('All blocks summarized', {
    blockCount: summaries.length,
    durationMs: duration,
    avgPerBlock: Math.round(duration / blocks.length)
  });

  return summaries;
}
```

**Step 2: Commit**

```bash
git add src/lib/summary-agents.ts
git commit -m "feat: add Agent B (Writer) with parallel execution"
```

---

## Task 7: Add Agent C (Editor) to Sub-Agent Service

**Files:**
- Modify: `src/lib/summary-agents.ts`

**Step 1: Add Agent C and orchestration function**

Add the following code at the end of the file:

```typescript
// ============================================
// AGENT C: THE EDITOR
// ============================================

const AGENT_C_SYSTEM = `You are an expert content editor. Your job is to synthesize multiple topic block summaries into a cohesive final summary of the entire podcast episode.

Respond ONLY with valid JSON. No markdown, no explanations.`;

const AGENT_C_PROMPT = `Synthesize these topic block summaries into a final episode summary.

Speakers in this episode:
{SPEAKERS}

Block Summaries:
{BLOCK_SUMMARIES}

Return a JSON object:
{
  "tldr": "2-3 sentences capturing the essence of the entire episode",
  "sections": [
    {
      "title": "Section title",
      "summary": "2-3 sentences summarizing this section with speaker attribution",
      "keyPoints": ["point 1", "point 2"],
      "speakers": ["John (Host)", "Sarah (Guest)"]
    }
  ],
  "keyTakeaways": ["5-7 most important insights from the episode"],
  "actionItems": ["2-4 concrete actions listeners can take"],
  "topics": ["topic1", "topic2", "topic3"]
}

RULES:
- tldr should capture the main value proposition of the episode
- Sections should follow the natural flow of the episode (can merge or split blocks as needed)
- keyTakeaways should be specific and valuable, not generic
- actionItems should be practical and actionable
- topics should be 3-5 key themes (1-3 words each)
- IMPORTANT: Write in the SAME LANGUAGE as the source content

`;

export async function synthesizeFinalSummary(
  blockSummaries: BlockSummary[],
  speakers: SpeakerInfo[]
): Promise<FinalSummary> {
  logWithTime('Agent C (Editor) starting', { blockCount: blockSummaries.length });

  const startTime = Date.now();

  // Format speakers
  const speakerList = speakers
    .map(s => `- ${s.name} (${s.role})`)
    .join('\n');

  // Format block summaries
  const summariesText = blockSummaries
    .map((bs, i) => `
### Block ${i + 1}: ${bs.label}
Summary: ${bs.summary}
Key Points:
${bs.keyPoints.map(p => `- ${p}`).join('\n')}
Speaker Contributions:
${bs.speakerContributions.map(c => `- ${c.speaker}: ${c.contribution}`).join('\n')}
`)
    .join('\n---\n');

  const prompt = AGENT_C_PROMPT
    .replace('{SPEAKERS}', speakerList)
    .replace('{BLOCK_SUMMARIES}', summariesText);

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: AGENT_C_SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = message.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Agent C');
    }

    let jsonText = textContent.text.trim();
    if (!jsonText.startsWith('{')) {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) jsonText = match[0];
      else throw new Error('No JSON found in Agent C response');
    }

    const parsed = JSON.parse(jsonText);

    const duration = Date.now() - startTime;
    logWithTime('Agent C completed', { durationMs: duration });

    return {
      tldr: parsed.tldr || '',
      speakers,
      sections: (parsed.sections || []).map((s: {
        title: string;
        summary: string;
        keyPoints: string[];
        speakers: string[];
      }) => ({
        title: s.title || '',
        summary: s.summary || '',
        keyPoints: s.keyPoints || [],
        speakers: s.speakers || [],
      })),
      keyTakeaways: parsed.keyTakeaways || [],
      actionItems: parsed.actionItems || [],
      topics: parsed.topics || [],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWithTime('Agent C FAILED', { durationMs: duration, error: errorMsg });
    throw new Error(`Agent C (Editor) failed: ${errorMsg}`);
  }
}

// ============================================
// ORCHESTRATION: Full sub-agent pipeline
// ============================================

export async function runSubAgentPipeline(transcript: DiarizedTranscript): Promise<FinalSummary> {
  logWithTime('=== SUB-AGENT PIPELINE STARTED ===', {
    utteranceCount: transcript.utterances.length,
    duration: transcript.duration,
  });

  const pipelineStart = Date.now();

  // Step 1: Agent A analyzes transcript
  const analysis = await analyzeTranscript(transcript);

  // Step 2: Agent B summarizes all blocks in parallel
  const blockSummaries = await summarizeAllBlocks(analysis.topicBlocks, analysis.speakers);

  // Step 3: Agent C synthesizes final summary
  const finalSummary = await synthesizeFinalSummary(blockSummaries, analysis.speakers);

  const totalDuration = Date.now() - pipelineStart;
  logWithTime('=== SUB-AGENT PIPELINE COMPLETED ===', {
    totalDurationMs: totalDuration,
    totalDurationSec: (totalDuration / 1000).toFixed(1),
    speakersFound: analysis.speakers.length,
    blocksProcessed: blockSummaries.length,
    sectionsGenerated: finalSummary.sections.length,
  });

  return finalSummary;
}
```

**Step 2: Commit**

```bash
git add src/lib/summary-agents.ts
git commit -m "feat: add Agent C (Editor) and orchestration pipeline"
```

---

## Task 8: Update Summary Service to Use New Architecture

**Files:**
- Modify: `src/lib/summary-service.ts`

**Step 1: Replace imports and add new ones**

Replace the imports at the top of the file:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./supabase";
import { transcribeFromUrl, formatTranscriptWithTimestamps } from "./deepgram";
import { runSubAgentPipeline } from "./summary-agents";
import type { DiarizedTranscript } from "@/types/deepgram";
import type { FinalSummary } from "@/types/summary-agents";
import type {
  SummaryLevel,
  SummaryStatus,
  TranscriptStatus,
  QuickSummaryContent,
  DeepSummaryContent
} from "@/types/database";
```

**Step 2: Update ensureTranscript function**

Replace the `ensureTranscript` function:

```typescript
export async function ensureTranscript(episodeId: string, audioUrl: string, language = 'en'): Promise<{
  status: TranscriptStatus;
  text?: string;
  transcript?: DiarizedTranscript;
  error?: string;
}> {
  const startTime = Date.now();
  logWithTime('ensureTranscript started', { episodeId, audioUrl: audioUrl.substring(0, 80) + '...', language });

  // Check if transcript exists
  logWithTime('Checking for existing transcript...');
  const dbCheckStart = Date.now();
  const { data: existing } = await supabase
    .from('transcripts')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('language', language)
    .single();
  logWithTime('DB check completed', { durationMs: Date.now() - dbCheckStart, found: !!existing, status: existing?.status });

  if (existing) {
    if (existing.status === 'ready' && existing.full_text) {
      logWithTime('Returning cached transcript', { textLength: existing.full_text.length });
      // Parse stored diarized data if available
      const diarizedData = existing.diarized_json as DiarizedTranscript | null;
      return {
        status: 'ready',
        text: existing.full_text,
        transcript: diarizedData || undefined
      };
    }
    if (existing.status === 'failed') {
      logWithTime('Previous transcript failed, will retry', { error: existing.error_message });
    }
    if (existing.status === 'queued' || existing.status === 'transcribing') {
      logWithTime('Transcript already in progress', { status: existing.status });
      return { status: existing.status };
    }
  }

  // Create or update transcript record as queued
  logWithTime('Creating transcript record (queued)...');
  const { error: upsertError } = await supabase
    .from('transcripts')
    .upsert({
      episode_id: episodeId,
      language,
      status: 'queued',
      updated_at: new Date().toISOString()
    }, { onConflict: 'episode_id,language' });

  if (upsertError) {
    logWithTime('DB upsert error', { error: upsertError });
    return { status: 'failed', error: 'Database error' };
  }

  // Update to transcribing
  logWithTime('Updating status to transcribing...');
  await supabase
    .from('transcripts')
    .update({ status: 'transcribing' })
    .eq('episode_id', episodeId)
    .eq('language', language);

  try {
    logWithTime('Starting transcription via Deepgram...');
    const transcribeStart = Date.now();
    const diarizedTranscript = await transcribeFromUrl(audioUrl);
    const formattedText = formatTranscriptWithTimestamps(diarizedTranscript);

    logWithTime('Transcription completed', {
      durationMs: Date.now() - transcribeStart,
      durationSec: ((Date.now() - transcribeStart) / 1000).toFixed(1),
      textLength: formattedText.length,
      utteranceCount: diarizedTranscript.utterances.length,
      speakerCount: diarizedTranscript.speakerCount
    });

    logWithTime('Saving transcript to DB...');
    const saveStart = Date.now();
    await supabase
      .from('transcripts')
      .update({
        status: 'ready',
        full_text: formattedText,
        diarized_json: diarizedTranscript,
        provider: 'deepgram'
      })
      .eq('episode_id', episodeId)
      .eq('language', language);
    logWithTime('Transcript saved', { durationMs: Date.now() - saveStart });

    logWithTime('ensureTranscript completed successfully', { totalDurationMs: Date.now() - startTime });
    return { status: 'ready', text: formattedText, transcript: diarizedTranscript };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Transcription failed';
    logWithTime('Transcription FAILED', { error: errorMsg, totalDurationMs: Date.now() - startTime });
    await supabase
      .from('transcripts')
      .update({ status: 'failed', error_message: errorMsg })
      .eq('episode_id', episodeId)
      .eq('language', language);

    return { status: 'failed', error: errorMsg };
  }
}
```

**Step 3: Update generateSummaryForLevel to use sub-agents for deep summaries**

Replace the `generateSummaryForLevel` function:

```typescript
export async function generateSummaryForLevel(
  episodeId: string,
  level: SummaryLevel,
  transcriptText: string,
  language = 'en',
  diarizedTranscript?: DiarizedTranscript
): Promise<{ status: SummaryStatus; content?: QuickSummaryContent | DeepSummaryContent; error?: string }> {
  const startTime = Date.now();
  logWithTime('generateSummaryForLevel started', { episodeId, level, language, transcriptLength: transcriptText.length });

  // Update status to summarizing
  logWithTime('Updating status to summarizing...');
  await supabase
    .from('summaries')
    .update({ status: 'summarizing' })
    .eq('episode_id', episodeId)
    .eq('level', level)
    .eq('language', language);

  try {
    let content: QuickSummaryContent | DeepSummaryContent;

    if (level === 'deep' && diarizedTranscript) {
      // Use sub-agent pipeline for deep summaries with diarized data
      logWithTime('Using sub-agent pipeline for deep summary...');
      const finalSummary = await runSubAgentPipeline(diarizedTranscript);

      // Transform FinalSummary to DeepSummaryContent
      content = transformFinalSummaryToDeep(finalSummary);
    } else {
      // Use traditional single-call approach for quick summaries
      logWithTime('Using traditional approach...', { model: 'claude-sonnet-4-5-20250514' });
      content = await generateWithClaude(level, transcriptText, language);
    }

    logWithTime('Saving summary to DB...');
    const saveStart = Date.now();
    await supabase
      .from('summaries')
      .update({
        status: 'ready',
        content_json: content,
        error_message: null
      })
      .eq('episode_id', episodeId)
      .eq('level', level)
      .eq('language', language);
    logWithTime('Summary saved', { durationMs: Date.now() - saveStart });

    // Auto-generate Quick summary if we just completed a Deep summary
    if (level === 'deep') {
      logWithTime('Auto-generating Quick summary from completed Deep summary...');
      generateQuickFromDeep(episodeId, content as DeepSummaryContent, language)
        .then(result => {
          logWithTime('Auto-generated Quick summary', { status: result.status });
        })
        .catch(error => {
          logWithTime('Auto-generation of Quick summary failed', { error });
        });
    }

    logWithTime('generateSummaryForLevel completed successfully', { totalDurationMs: Date.now() - startTime });
    return { status: 'ready', content };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Summary generation failed';
    logWithTime('Summary generation FAILED', { error: errorMsg, totalDurationMs: Date.now() - startTime });
    await supabase
      .from('summaries')
      .update({ status: 'failed', error_message: errorMsg })
      .eq('episode_id', episodeId)
      .eq('level', level)
      .eq('language', language);

    return { status: 'failed', error: errorMsg };
  }
}

// Transform FinalSummary to DeepSummaryContent format
function transformFinalSummaryToDeep(summary: FinalSummary): DeepSummaryContent {
  return {
    tldr: summary.tldr,
    sections: summary.sections.map(s => ({
      title: s.title,
      summary: s.summary,
      key_points: s.keyPoints,
    })),
    resources: [], // Sub-agents don't extract resources currently
    action_prompts: summary.actionItems.map(item => ({
      title: item.split(':')[0] || item,
      details: item,
    })),
    topics: summary.topics,
  };
}

// Traditional single-call Claude generation
async function generateWithClaude(
  level: SummaryLevel,
  transcriptText: string,
  language: string
): Promise<QuickSummaryContent | DeepSummaryContent> {
  const prompt = level === 'quick' ? QUICK_PROMPT : DEEP_PROMPT;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: level === 'quick' ? 1500 : 4000,
    system: SYSTEM_MESSAGE,
    messages: [{
      role: "user",
      content: prompt + transcriptText.substring(0, 100000)
    }]
  });

  const textContent = message.content[0];
  if (textContent.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  let jsonText = textContent.text.trim();
  if (!jsonText.startsWith('{')) {
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      throw new Error('No JSON object found in response');
    }
  }

  return JSON.parse(jsonText);
}
```

**Step 4: Update requestSummary to pass diarized transcript**

In the `requestSummary` function, update the call to `generateSummaryForLevel`:

```typescript
  // Generate the summary
  logWithTime('Calling generateSummaryForLevel...');
  const result = await generateSummaryForLevel(
    episodeId,
    level,
    transcriptResult.text,
    language,
    transcriptResult.transcript // Pass diarized transcript for sub-agent pipeline
  );
```

**Step 5: Commit**

```bash
git add src/lib/summary-service.ts
git commit -m "feat: integrate Deepgram and sub-agent pipeline into summary service"
```

---

## Task 9: Delete Legacy Groq/FFmpeg Files

**Files:**
- Delete: `src/lib/groq.ts`
- Delete: `src/types/ffmpeg-static.d.ts`

**Step 1: Delete the files**

```bash
rm src/lib/groq.ts
rm src/types/ffmpeg-static.d.ts
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove legacy Groq and FFmpeg files"
```

---

## Task 10: Remove Legacy Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Uninstall packages**

```bash
npm uninstall groq-sdk ffmpeg-static fluent-ffmpeg @types/fluent-ffmpeg
```

**Step 2: Verify removal**

Run:
```bash
npm list groq-sdk ffmpeg-static fluent-ffmpeg
```
Expected: All show as "empty" or not found

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove Groq and FFmpeg dependencies"
```

---

## Task 11: Update Environment Configuration

**Files:**
- Modify: `.env.local.example`

**Step 1: Update the example file**

Replace the Groq section with Deepgram:

```bash
# Deepgram (Transcription)
DEEPGRAM_API_KEY=your_deepgram_api_key
```

And remove:
```bash
# Groq
GROQ_API_KEY=your_groq_api_key
```

**Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs: update env example with Deepgram, remove Groq"
```

---

## Task 12: Update Insights Service

**Files:**
- Modify: `src/lib/insights-service.ts`

**Step 1: Update model to Sonnet 4.5**

Change the model in `generateInsights`:

```typescript
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250514",  // Changed from haiku
  max_tokens: 4000,
  // ...rest unchanged
});
```

**Step 2: Commit**

```bash
git add src/lib/insights-service.ts
git commit -m "feat: upgrade insights service to Claude Sonnet 4.5"
```

---

## Task 13: Add Database Migration for Diarized Data

**Files:**
- Create: `supabase/migrations/add_diarized_json.sql` (or run manually)

**Step 1: Create migration to add diarized_json column**

The `transcripts` table needs a new column to store diarized data:

```sql
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS diarized_json JSONB;

COMMENT ON COLUMN transcripts.diarized_json IS 'Stores the full diarized transcript with utterances and speaker info';
```

**Step 2: Run migration**

Apply via Supabase dashboard or CLI:
```bash
supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add diarized_json column to transcripts table"
```

---

## Task 14: Final Verification

**Step 1: Run build to check for errors**

```bash
npm run build
```
Expected: Build succeeds with no TypeScript errors

**Step 2: Run lint**

```bash
npm run lint
```
Expected: No errors (warnings acceptable)

**Step 3: Test locally (manual)**

1. Start dev server: `npm run dev`
2. Navigate to a podcast episode
3. Click "Summarize"
4. Verify transcription uses Deepgram (check console logs for `[DEEPGRAM]`)
5. Verify sub-agent pipeline runs for deep summaries (check logs for `[SUMMARY-AGENTS]`)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete transcription/summarization refactor

- Replaced Groq+FFmpeg with Deepgram Whisper Cloud
- Implemented sub-agent workflow (Analyst→Writer→Editor)
- Parallel processing for topic block summarization
- Speaker identification from conversation patterns
- Upgraded to Claude Sonnet 4.5"
```

---

## Summary of Changes

| Component | Before | After |
|-----------|--------|-------|
| Transcription | Groq Whisper + FFmpeg chunking | Deepgram Whisper Cloud |
| Chunking | Manual 10-min FFmpeg splits | Not needed (Deepgram handles) |
| Diarization | None | Deepgram speaker detection |
| Deep Summary | Single Claude Haiku call | 3-agent pipeline (Sonnet 4.5) |
| Quick Summary | Single Claude Haiku call | Single Sonnet 4.5 call |
| Speaker Names | None | Auto-extracted from conversation |
| Dependencies | groq-sdk, ffmpeg-static, fluent-ffmpeg | @deepgram/sdk |
