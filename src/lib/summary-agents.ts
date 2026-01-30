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

const MODEL = 'claude-sonnet-4-20250514';

function logWithTime(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[SUMMARY-AGENTS ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

// ============================================
// AGENT A: THE ANALYST
// ============================================

const AGENT_A_SYSTEM = `You are an expert podcast analyst. Your job is to:
1. Identify speakers by analyzing conversation patterns (introductions, greetings, name references)
2. Divide the episode into logical time-based topic blocks
3. Label each block with a descriptive title

Respond ONLY with valid JSON. No markdown, no explanations. Keep your response concise.`;

const AGENT_A_PROMPT = `Analyze this podcast transcript SAMPLE and return a JSON object.

Episode duration: {DURATION} minutes
Total utterances: {TOTAL_UTTERANCES}
Unique speakers detected: {SPEAKER_COUNT}

Return this JSON structure:
{
  "speakers": [
    { "id": 0, "name": "Host Name or Host", "role": "host" },
    { "id": 1, "name": "Guest Name or Guest", "role": "guest" }
  ],
  "topicBlocks": [
    {
      "id": "block-1",
      "label": "Introduction and Welcome",
      "startMinute": 0,
      "endMinute": 5,
      "primarySpeaker": 0
    },
    {
      "id": "block-2", 
      "label": "Main Discussion Topic",
      "startMinute": 5,
      "endMinute": 30,
      "primarySpeaker": 1
    }
  ]
}

RULES:
- Extract speaker names if mentioned ("Hi John", "I'm Sarah", "Thanks for having me, Mike")
- If no name found, use "Host", "Guest 1", "Guest 2" based on patterns
- Role: "host" welcomes/guides, "guest" is interviewed, "unknown" otherwise
- Create 4-8 time-based blocks covering the full episode duration
- Use startMinute/endMinute (integers) - blocks should cover 0 to {DURATION} minutes
- Labels should be descriptive: "Discussion: AI in Healthcare", "Personal Story: Career Journey"
- Respond in the SAME LANGUAGE as the transcript

Transcript sample (showing key moments):
`;

// Maximum characters to send to Agent A (to avoid truncation)
const MAX_TRANSCRIPT_CHARS = 30000;

/**
 * Sample utterances intelligently to stay within token limits
 * Takes utterances from beginning, middle sections, and end
 */
function sampleTranscript(utterances: Utterance[], maxChars: number): { sampled: Utterance[], indices: number[] } {
  if (utterances.length === 0) return { sampled: [], indices: [] };
  
  const totalDuration = utterances[utterances.length - 1].end;
  const numSections = 8; // Sample from 8 time sections
  const sectionDuration = totalDuration / numSections;
  
  const sampled: Utterance[] = [];
  const indices: number[] = [];
  const seen = new Set<number>();
  
  // Take first few utterances (for speaker identification)
  for (let i = 0; i < Math.min(20, utterances.length); i++) {
    if (!seen.has(i)) {
      sampled.push(utterances[i]);
      indices.push(i);
      seen.add(i);
    }
  }
  
  // Sample from each time section
  for (let section = 0; section < numSections; section++) {
    const sectionStart = section * sectionDuration;
    const sectionEnd = (section + 1) * sectionDuration;
    
    // Find utterances in this section
    const sectionUtterances = utterances
      .map((u, i) => ({ u, i }))
      .filter(({ u }) => u.start >= sectionStart && u.start < sectionEnd);
    
    // Take up to 10 utterances per section
    const toTake = Math.min(10, sectionUtterances.length);
    const step = Math.max(1, Math.floor(sectionUtterances.length / toTake));
    
    for (let j = 0; j < sectionUtterances.length && sampled.length < 150; j += step) {
      const { u, i } = sectionUtterances[j];
      if (!seen.has(i)) {
        sampled.push(u);
        indices.push(i);
        seen.add(i);
      }
    }
  }
  
  // Take last few utterances
  for (let i = Math.max(0, utterances.length - 10); i < utterances.length; i++) {
    if (!seen.has(i)) {
      sampled.push(utterances[i]);
      indices.push(i);
      seen.add(i);
    }
  }
  
  // Sort by original order
  const combined = sampled.map((u, idx) => ({ u, origIdx: indices[idx] }));
  combined.sort((a, b) => a.origIdx - b.origIdx);
  
  return {
    sampled: combined.map(c => c.u),
    indices: combined.map(c => c.origIdx)
  };
}

export async function analyzeTranscript(transcript: DiarizedTranscript): Promise<AnalysisResult> {
  logWithTime('Agent A (Analyst) starting', {
    utteranceCount: transcript.utterances.length,
    speakerCount: transcript.speakerCount,
    durationMinutes: Math.round(transcript.duration / 60)
  });

  const startTime = Date.now();
  const durationMinutes = Math.round(transcript.duration / 60);

  // Sample transcript to stay within limits
  const { sampled } = sampleTranscript(transcript.utterances, MAX_TRANSCRIPT_CHARS);
  
  logWithTime('Transcript sampled for Agent A', {
    originalCount: transcript.utterances.length,
    sampledCount: sampled.length
  });

  // Format sampled transcript with timestamps
  const formattedTranscript = sampled
    .map(u => {
      const mins = Math.floor(u.start / 60);
      const secs = Math.floor(u.start % 60);
      return `[${mins}:${secs.toString().padStart(2, '0')}] Speaker ${u.speaker}: ${u.text}`;
    })
    .join('\n')
    .substring(0, MAX_TRANSCRIPT_CHARS);

  const prompt = AGENT_A_PROMPT
    .replace(/{DURATION}/g, String(durationMinutes))
    .replace('{TOTAL_UTTERANCES}', String(transcript.utterances.length))
    .replace('{SPEAKER_COUNT}', String(transcript.speakerCount))
    + formattedTranscript;

  try {
    logWithTime('Sending to Claude...', { promptLength: prompt.length });
    
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000, // Reduced - we only need a small JSON response
      system: AGENT_A_SYSTEM,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const textContent = message.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Agent A');
    }

    logWithTime('Claude response received', { 
      responseLength: textContent.text.length,
      stopReason: message.stop_reason 
    });

    // Extract JSON from response
    let jsonText = textContent.text.trim();
    if (!jsonText.startsWith('{')) {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) jsonText = match[0];
      else {
        logWithTime('No JSON found in response', { response: textContent.text.substring(0, 500) });
        throw new Error('No JSON found in Agent A response');
      }
    }

    const parsed = JSON.parse(jsonText);

    // Transform to our types
    const speakers: SpeakerInfo[] = (parsed.speakers || []).map((s: { id: number; name: string; role: string }) => ({
      id: s.id,
      name: s.name || `Speaker ${s.id}`,
      role: (['host', 'guest', 'unknown'].includes(s.role) ? s.role : 'unknown') as SpeakerInfo['role'],
    }));

    // Convert time-based blocks to utterance-based blocks
    const topicBlocks: TopicBlock[] = (parsed.topicBlocks || []).map((block: {
      id: string;
      label: string;
      startMinute: number;
      endMinute: number;
      primarySpeaker: number
    }) => {
      const startSec = (block.startMinute || 0) * 60;
      const endSec = (block.endMinute || durationMinutes) * 60;
      
      // Find all utterances in this time range
      const blockUtterances = transcript.utterances.filter(
        u => u.start >= startSec && u.start < endSec
      );

      return {
        id: block.id,
        label: block.label,
        utterances: blockUtterances,
        primarySpeaker: block.primarySpeaker ?? 0,
        startTime: startSec,
        endTime: endSec,
      };
    });

    const duration = Date.now() - startTime;
    logWithTime('Agent A completed', {
      durationMs: duration,
      speakersFound: speakers.length,
      blocksCreated: topicBlocks.length,
      totalUtterancesAssigned: topicBlocks.reduce((sum, b) => sum + b.utterances.length, 0)
    });

    return { speakers, topicBlocks };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWithTime('Agent A FAILED', { durationMs: duration, error: errorMsg });
    throw new Error(`Agent A (Analyst) failed: ${errorMsg}`);
  }
}

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
