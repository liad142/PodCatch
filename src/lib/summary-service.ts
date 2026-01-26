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

// QUICK summary prompt - returns QuickSummaryContent JSON
const QUICK_PROMPT = `Analyze this podcast transcript and return a JSON object with this exact structure (no markdown, just valid JSON):

{
  "tldr": "2 sentences maximum summarizing the main point",
  "key_takeaways": ["takeaway 1", "takeaway 2", ...],  // 5-7 bullet points
  "who_is_this_for": "1 sentence describing the ideal listener",
  "topics": ["topic1", "topic2", "topic3"]  // 3-5 topic tags
}

Rules:
- No markdown in the JSON values
- If unsure about something, omit it rather than guess
- Keep takeaways actionable and specific
- Topics should be 1-2 words each

Transcript:
`;

// DEEP summary prompt - returns DeepSummaryContent JSON  
const DEEP_PROMPT = `Analyze this podcast transcript thoroughly and return a JSON object with this exact structure (no markdown, just valid JSON):

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
      "url": "https://... (only if actually mentioned, otherwise omit)",
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
- Create 3-6 logical sections based on the content flow
- Only include resources that were actually mentioned
- If a URL wasn't explicitly stated, omit the url field
- Action prompts should be practical things the listener can do
- No markdown in any JSON values
- No hallucinated URLs - if not mentioned, don't include

Transcript:
`;

export async function ensureTranscript(episodeId: string, audioUrl: string, language = 'en'): Promise<{
  status: TranscriptStatus;
  text?: string;
  error?: string;
}> {
  // Check if transcript exists
  const { data: existing } = await supabase
    .from('transcripts')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('language', language)
    .single();

  if (existing) {
    if (existing.status === 'ready' && existing.full_text) {
      return { status: 'ready', text: existing.full_text };
    }
    if (existing.status === 'failed') {
      return { status: 'failed', error: existing.error_message || 'Transcription failed' };
    }
    if (existing.status === 'queued' || existing.status === 'transcribing') {
      return { status: existing.status };
    }
  }

  // Create or update transcript record as queued
  const { error: upsertError } = await supabase
    .from('transcripts')
    .upsert({
      episode_id: episodeId,
      language,
      status: 'queued',
      updated_at: new Date().toISOString()
    }, { onConflict: 'episode_id,language' });

  if (upsertError) {
    console.error('Error upserting transcript:', upsertError);
    return { status: 'failed', error: 'Database error' };
  }

  // Update to transcribing
  await supabase
    .from('transcripts')
    .update({ status: 'transcribing' })
    .eq('episode_id', episodeId)
    .eq('language', language);

  try {
    const transcriptText = await transcribeFromUrl(audioUrl);
    
    await supabase
      .from('transcripts')
      .update({ 
        status: 'ready', 
        full_text: transcriptText,
        provider: 'groq'
      })
      .eq('episode_id', episodeId)
      .eq('language', language);

    return { status: 'ready', text: transcriptText };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Transcription failed';
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
  
  // Update status to summarizing
  await supabase
    .from('summaries')
    .update({ status: 'summarizing' })
    .eq('episode_id', episodeId)
    .eq('level', level)
    .eq('language', language);

  const prompt = level === 'quick' ? QUICK_PROMPT : DEEP_PROMPT;
  
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20250924",
      max_tokens: level === 'quick' ? 1500 : 4000,
      messages: [{
        role: "user",
        content: prompt + transcriptText.substring(0, 100000)
      }]
    });

    const textContent = message.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const content = JSON.parse(textContent.text);

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

    return { status: 'ready', content };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Summary generation failed';
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
  
  // Check existing summary
  const { data: existing } = await supabase
    .from('summaries')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('level', level)
    .eq('language', language)
    .single();

  if (existing) {
    if (existing.status === 'ready' && existing.content_json) {
      return { status: 'ready', content: existing.content_json };
    }
    if (['queued', 'transcribing', 'summarizing'].includes(existing.status)) {
      return { status: existing.status as SummaryStatus };
    }
    // If failed or not_ready, we'll try again
  }

  // Create summary record as queued
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
  const transcriptResult = await ensureTranscript(episodeId, audioUrl, language);
  
  if (transcriptResult.status !== 'ready' || !transcriptResult.text) {
    // Update summary status to match transcript status
    const summaryStatus: SummaryStatus = transcriptResult.status === 'failed' ? 'failed' : 'transcribing';
    await supabase
      .from('summaries')
      .update({ 
        status: summaryStatus,
        error_message: transcriptResult.error || null
      })
      .eq('episode_id', episodeId)
      .eq('level', level)
      .eq('language', language);
    
    return { status: summaryStatus };
  }

  // Generate the summary
  return generateSummaryForLevel(episodeId, level, transcriptResult.text, language);
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
