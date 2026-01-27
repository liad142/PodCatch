import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./supabase";
import { transcribeFromUrl } from "./groq";
import type {
  SummaryLevel,
  SummaryStatus,
  TranscriptStatus,
  QuickSummaryContent,
  DeepSummaryContent
} from "@/types/database";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function logWithTime(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[SUMMARY-SERVICE ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

// System message to enforce JSON-only responses
const SYSTEM_MESSAGE = `You are a JSON-only response bot. You MUST respond with ONLY valid JSON - no explanations, no markdown, no text before or after the JSON. Start your response with { and end with }. Never say "Based on" or any other text.`;

// QUICK summary prompt - returns QuickSummaryContent JSON
const QUICK_PROMPT = `Return ONLY a JSON object (no text, no markdown) with this exact structure:

{
  "tldr": "2 sentences maximum summarizing the main point",
  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4", "takeaway 5"],
  "who_is_this_for": "1 sentence describing the ideal listener",
  "topics": ["topic1", "topic2", "topic3"]
}

Rules:
- Start response with { and end with }
- No markdown in the JSON values
- 5-7 key_takeaways
- 3-5 topics (1-2 words each)

Transcript:
`;

// DEEP summary prompt - returns DeepSummaryContent JSON
const DEEP_PROMPT = `Return ONLY a JSON object (no text, no markdown) with this exact structure:

{
  "tldr": "2 sentences maximum summarizing the main point",
  "sections": [
    {
      "title": "Section title describing the topic",
      "summary": "2-4 sentences summarizing this section",
      "key_points": ["point 1", "point 2"]
    }
  ],
  "resources": [
    {
      "type": "repo|link|tool|person|paper|other",
      "label": "Human readable name",
      "url": "https://... (only if actually mentioned)",
      "notes": "Optional context"
    }
  ],
  "action_prompts": [
    {
      "title": "Action title",
      "details": "Concrete next step with clear instructions"
    }
  ],
  "topics": ["topic1", "topic2"]
}

Rules:
- Start response with { and end with }
- 3-6 sections based on content flow
- Only include resources actually mentioned (omit url field if not stated)
- 2-4 practical action prompts
- 3-5 topics
- No markdown in values, no hallucinated URLs

Transcript:
`;

export async function ensureTranscript(episodeId: string, audioUrl: string, language = 'en'): Promise<{
  status: TranscriptStatus;
  text?: string;
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
      return { status: 'ready', text: existing.full_text };
    }
    if (existing.status === 'failed') {
      logWithTime('Previous transcript failed, will retry', { error: existing.error_message });
      // Don't return early - allow retry by continuing to transcription
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
    logWithTime('Starting transcription via Groq...');
    const transcribeStart = Date.now();
    const transcriptText = await transcribeFromUrl(audioUrl);
    logWithTime('Transcription completed', {
      durationMs: Date.now() - transcribeStart,
      durationSec: ((Date.now() - transcribeStart) / 1000).toFixed(1),
      textLength: transcriptText.length
    });

    logWithTime('Saving transcript to DB...');
    const saveStart = Date.now();
    await supabase
      .from('transcripts')
      .update({
        status: 'ready',
        full_text: transcriptText,
        provider: 'groq'
      })
      .eq('episode_id', episodeId)
      .eq('language', language);
    logWithTime('Transcript saved', { durationMs: Date.now() - saveStart });

    logWithTime('ensureTranscript completed successfully', { totalDurationMs: Date.now() - startTime });
    return { status: 'ready', text: transcriptText };
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

export async function generateSummaryForLevel(
  episodeId: string,
  level: SummaryLevel,
  transcriptText: string,
  language = 'en'
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

  const prompt = level === 'quick' ? QUICK_PROMPT : DEEP_PROMPT;
  const inputLength = (prompt + transcriptText.substring(0, 100000)).length;
  logWithTime('Calling Anthropic API...', { model: 'claude-3-5-haiku-20241022', inputLength });

  try {
    const apiStart = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: level === 'quick' ? 1500 : 4000,
      system: SYSTEM_MESSAGE,
      messages: [{
        role: "user",
        content: prompt + transcriptText.substring(0, 100000)
      }]
    });
    logWithTime('Anthropic API completed', {
      durationMs: Date.now() - apiStart,
      durationSec: ((Date.now() - apiStart) / 1000).toFixed(1),
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens
    });

    const textContent = message.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    logWithTime('Parsing JSON response...');

    // Try to extract JSON from the response (in case model added text before/after)
    let jsonText = textContent.text.trim();

    // If response doesn't start with {, try to find JSON in the response
    if (!jsonText.startsWith('{')) {
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        logWithTime('Extracted JSON from wrapped response');
        jsonText = jsonMatch[0];
      } else {
        throw new Error('No JSON object found in response');
      }
    }

    const content = JSON.parse(jsonText);

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

export async function requestSummary(
  episodeId: string,
  level: SummaryLevel,
  audioUrl: string,
  language = 'en'
): Promise<{ status: SummaryStatus; content?: QuickSummaryContent | DeepSummaryContent }> {
  const startTime = Date.now();
  logWithTime('=== requestSummary STARTED ===', { episodeId, level, language });

  // Check existing summary
  logWithTime('Checking for existing summary...');
  const checkStart = Date.now();
  const { data: existing } = await supabase
    .from('summaries')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('level', level)
    .eq('language', language)
    .single();
  logWithTime('Existing summary check completed', { durationMs: Date.now() - checkStart, found: !!existing, status: existing?.status });

  if (existing) {
    if (existing.status === 'ready' && existing.content_json) {
      logWithTime('Returning cached summary', { totalDurationMs: Date.now() - startTime });
      return { status: 'ready', content: existing.content_json };
    }
    if (['queued', 'transcribing', 'summarizing'].includes(existing.status)) {
      logWithTime('Summary already in progress', { status: existing.status, totalDurationMs: Date.now() - startTime });
      return { status: existing.status as SummaryStatus };
    }
    logWithTime('Summary exists but needs retry', { status: existing.status });
    // If failed or not_ready, we'll try again
  }

  // Create summary record as queued
  logWithTime('Creating summary record (queued)...');
  await supabase
    .from('summaries')
    .upsert({
      episode_id: episodeId,
      level,
      language,
      status: 'queued',
      updated_at: new Date().toISOString()
    }, { onConflict: 'episode_id,level,language' });

  // Ensure transcript exists (this is blocking for now, could be async)
  logWithTime('Calling ensureTranscript...');
  const transcriptResult = await ensureTranscript(episodeId, audioUrl, language);
  logWithTime('ensureTranscript returned', { status: transcriptResult.status, hasText: !!transcriptResult.text, error: transcriptResult.error });

  if (transcriptResult.status !== 'ready' || !transcriptResult.text) {
    // Update summary status to match transcript status
    const summaryStatus: SummaryStatus = transcriptResult.status === 'failed' ? 'failed' : 'transcribing';
    logWithTime('Transcript not ready, updating summary status', { summaryStatus });
    await supabase
      .from('summaries')
      .update({
        status: summaryStatus,
        error_message: transcriptResult.error || null
      })
      .eq('episode_id', episodeId)
      .eq('level', level)
      .eq('language', language);

    logWithTime('=== requestSummary ENDED (transcript not ready) ===', { totalDurationMs: Date.now() - startTime });
    return { status: summaryStatus };
  }

  // Generate the summary
  logWithTime('Calling generateSummaryForLevel...');
  const result = await generateSummaryForLevel(episodeId, level, transcriptResult.text, language);
  logWithTime('=== requestSummary ENDED ===', { status: result.status, totalDurationMs: Date.now() - startTime, totalDurationSec: ((Date.now() - startTime) / 1000).toFixed(1) });
  return result;
}

export async function getSummariesStatus(episodeId: string, language = 'en') {
  const { data: transcript } = await supabase
    .from('transcripts')
    .select('status, language')
    .eq('episode_id', episodeId)
    .eq('language', language)
    .single();

  const { data: summaries } = await supabase
    .from('summaries')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('language', language);

  const quick = summaries?.find(s => s.level === 'quick');
  const deep = summaries?.find(s => s.level === 'deep');

  return {
    episodeId,
    transcript: transcript ? { status: transcript.status, language: transcript.language } : null,
    summaries: {
      quick: quick ? {
        status: quick.status,
        content: quick.status === 'ready' ? quick.content_json : undefined,
        updatedAt: quick.updated_at
      } : null,
      deep: deep ? {
        status: deep.status,
        content: deep.status === 'ready' ? deep.content_json : undefined,
        updatedAt: deep.updated_at
      } : null
    }
  };
}
