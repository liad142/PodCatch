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
