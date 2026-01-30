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
