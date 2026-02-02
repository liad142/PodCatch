import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import { transcribeFromUrl, formatTranscriptWithTimestamps, formatTranscriptWithSpeakerNames } from "./deepgram";
import type { DiarizedTranscript } from "@/types/deepgram";
import type {
  SummaryLevel,
  SummaryStatus,
  TranscriptStatus,
  QuickSummaryContent,
  DeepSummaryContent
} from "@/types/database";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

// Model selection: Flash for Quick, Pro for Deep analysis
function getModelForLevel(level: SummaryLevel) {
  if (level === 'deep') {
    return genAI.getGenerativeModel({ 
      model: "gemini-3-pro-preview",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
  } else {
    return genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
  }
}

const isDev = process.env.NODE_ENV === 'development';

function logWithTime(message: string, data?: Record<string, unknown>) {
  if (isDev) {
    const timestamp = new Date().toISOString();
    console.log(`[SUMMARY-SERVICE ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
  }
}

// Speaker identification types
export interface IdentifiedSpeaker {
  id: number;
  name: string;
  role: 'host' | 'guest' | 'unknown';
}

const SPEAKER_ID_PROMPT = `Analyze this podcast transcript and identify the speakers.

Return ONLY a JSON object with this structure:
{
  "speakers": [
    { "id": 0, "name": "John Smith", "role": "host" },
    { "id": 1, "name": "Sarah Johnson", "role": "guest" }
  ]
}

RULES:
- Look for introductions: "Hi, I'm...", "Welcome to...", "Thanks for having me...", "My name is..."
- Look for names mentioned: "Thanks John", "So Sarah, tell us...", "As Mike said..."
- Role "host" = person who welcomes, introduces, asks questions
- Role "guest" = person being interviewed, sharing expertise
- Role "unknown" = can't determine
- If no name found, use descriptive names like "Host", "Guest", "Interviewer", "Expert"
- IMPORTANT: If the transcript is in Hebrew/Spanish/etc., names should still be extracted in their original form
- Always return valid JSON starting with { and ending with }

Transcript sample:
`;

/**
 * Use Claude to identify speaker names from transcript
 */
export async function identifySpeakers(transcript: DiarizedTranscript): Promise<IdentifiedSpeaker[]> {
  logWithTime('identifySpeakers starting', { 
    speakerCount: transcript.speakerCount,
    utteranceCount: transcript.utterances.length 
  });

  const startTime = Date.now();

  // Sample the beginning of the transcript (first 5 minutes) where introductions usually happen
  // Plus some from the middle and end for context
  const fiveMinutes = 5 * 60;
  const beginningUtterances = transcript.utterances.filter(u => u.start < fiveMinutes);
  
  // Also get some samples from middle (for name mentions)
  const middleStart = transcript.duration / 3;
  const middleEnd = (transcript.duration / 3) * 2;
  const middleUtterances = transcript.utterances
    .filter(u => u.start >= middleStart && u.start < middleEnd)
    .slice(0, 20);

  const sampleUtterances = [...beginningUtterances, ...middleUtterances];
  
  // Format for Claude
  const formattedSample = sampleUtterances
    .map(u => `[Speaker ${u.speaker}]: ${u.text}`)
    .join('\n')
    .substring(0, 15000); // Limit to ~15k chars

  try {
    const systemPrompt = "You are a JSON-only response bot. Return ONLY valid JSON.";
    const fullPrompt = systemPrompt + "\n\n" + SPEAKER_ID_PROMPT + formattedSample;
    
    // Use Flash model for speaker identification (fast, cheap task)
    const speakerModel = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    
    const result = await speakerModel.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON
    let jsonText = text.trim();
    if (!jsonText.startsWith('{')) {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) jsonText = match[0];
      else throw new Error('No JSON found');
    }

    const parsed = JSON.parse(jsonText);
    const speakers: IdentifiedSpeaker[] = (parsed.speakers || []).map((s: { id: number; name: string; role: string }) => ({
      id: s.id,
      name: s.name || `Speaker ${s.id}`,
      role: (['host', 'guest', 'unknown'].includes(s.role) ? s.role : 'unknown') as IdentifiedSpeaker['role'],
    }));

    const duration = Date.now() - startTime;
    logWithTime('identifySpeakers completed', { 
      durationMs: duration,
      identifiedSpeakers: speakers.map(s => ({ id: s.id, name: s.name, role: s.role }))
    });

    return speakers;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWithTime('identifySpeakers FAILED', { error: errorMsg });
    
    // Return default speaker names on failure
    const defaultSpeakers: IdentifiedSpeaker[] = [];
    for (let i = 0; i < transcript.speakerCount; i++) {
      defaultSpeakers.push({
        id: i,
        name: i === 0 ? 'Host' : `Guest ${i}`,
        role: i === 0 ? 'host' : 'guest'
      });
    }
    return defaultSpeakers;
  }
}

// System message to enforce JSON-only responses
const SYSTEM_MESSAGE = `You are a JSON-only response bot. You MUST respond with ONLY valid JSON - no explanations, no markdown, no text before or after the JSON. Start your response with { and end with }. Never say "Based on" or any other text.

CRITICAL: You MUST detect the language of the transcript and respond in THE SAME LANGUAGE. This works for ANY language - Hebrew, Spanish, French, German, Japanese, Arabic, Portuguese, Russian, Chinese, or any other. Match the transcript language exactly.`;

// QUICK summary prompt - returns QuickSummaryContent JSON
const QUICK_PROMPT = `You are a senior editor at a top-tier media outlet (like The Economist or TechCrunch).
Your goal is to write a "Teaser Card" that compels the user to consume the full content.

Return ONLY a JSON object with this exact structure:

{
  "hook_headline": "A punchy, provocative 5-10 word headline that captures the essence. NOT 'Summary of episode'.",
  
  "executive_brief": "2-3 sharp sentences (max 60 words). Don't describe *what* they talked about, describe the *insight* revealed. Start directly with the core conflict or idea.",
  
  "golden_nugget": "The single most surprising or valuable fact/quote from the episode. The 'I didn't know that' moment.",
  
  "perfect_for": "Specific audience targeting. E.g., 'Founders raising capital' instead of 'Business people'.",
  
  "tags": ["tag1", "tag2", "tag3"]
}

RULES:
1. **Language**: CRITICAL - Write ALL content in the SAME LANGUAGE as the transcript.
2. **No Passive Voice**: Avoid "In this episode it is discussed...". Say "The host argues that...".
3. **Curiosity Gap**: The headline and brief should create curiosity.
4. **Specifics over Generalities**: Use specific numbers or names if available in the text.
`;

// DEEP summary prompt - returns DeepSummaryContent JSON
const DEEP_PROMPT = `You are an expert Ghostwriter and Analyst with a PhD in the subject matter of the transcript.
Your goal is to write a comprehensive "Executive Briefing" that completely substitutes the need to listen to the episode.

Return ONLY a JSON object with this exact structure:

{
  "comprehensive_overview": "A detailed, multi-paragraph essay (400-600 words) summarizing the entire episode. capturing the nuance, the debate, and the narrative arc. Do NOT be brief.",
  
  "core_concepts": [
    {
      "concept": "Name of the concept/argument",
      "explanation": "Detailed explanation of what was discussed regarding this concept.",
      "quote_reference": "A short relevant quote if available (optional)"
    }
  ],

  "chronological_breakdown": [
    {
      "timestamp_description": "e.g., 'The Opening Argument' or 'The Middle East Discussion'",
      "content": "A meaty paragraph (100-150 words) detailing exactly what was said in this section. Include specific examples given by speakers."
    }
  ],

  "contrarian_views": [
    "List specific points where speakers disagreed or presented counter-intuitive ideas."
  ],

  "actionable_takeaways": [
    "Concrete advice or future predictions made in the episode."
  ]
}

RULES:
1. **Length is Virtue**: Do NOT summarize briefly. Provide depth. The user wants to read this for 10 minutes.
2. **Language**: CRITICAL - Write ALL content in the SAME LANGUAGE as the transcript (e.g., Hebrew for Hebrew podcasts).
3. **Tone**: Professional, analytical, but engaging. Avoid robotic phrasing like "The speakers discussed...". Instead, write directly: "Israel's geopolitical situation is shifting because..."
4. **Format**: Use Markdown formatting inside the JSON strings (e.g., **bold** for emphasis) to make the text readable.
5. **No Fluff**: Do not say "In this interesting episode...". Dive straight into the content.
`;


/**
 * Fetch transcript text from a URL (supports SRT, VTT, plain text formats)
 * This is the FREE option - no Deepgram costs!
 */
async function fetchTranscriptFromUrl(transcriptUrl: string): Promise<string | null> {
  logWithTime('Attempting to fetch transcript from RSS URL (FREE)', { url: transcriptUrl.substring(0, 100) });
  
  try {
    const response = await fetch(transcriptUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      logWithTime('Transcript fetch failed', { status: response.status, statusText: response.statusText });
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!text || text.trim().length < 50) {
      logWithTime('Transcript too short or empty', { length: text?.length });
      return null;
    }

    // Parse based on content type or file extension
    let parsed: string;
    if (contentType.includes('srt') || transcriptUrl.toLowerCase().endsWith('.srt')) {
      parsed = parseSrtToText(text);
    } else if (contentType.includes('vtt') || transcriptUrl.toLowerCase().endsWith('.vtt')) {
      parsed = parseVttToText(text);
    } else if (contentType.includes('json') || transcriptUrl.toLowerCase().endsWith('.json')) {
      parsed = parseJsonTranscript(text);
    } else {
      // Assume plain text - just clean it up
      parsed = text.trim();
    }

    logWithTime('Transcript fetched and parsed successfully (FREE)', { 
      originalLength: text.length, 
      parsedLength: parsed.length,
      format: contentType || 'unknown'
    });

    return parsed;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWithTime('Transcript fetch error', { error: errorMsg });
    return null;
  }
}

/**
 * Parse SRT format to plain text
 * SRT format: sequential number, timestamp line, text lines, blank line
 */
function parseSrtToText(srt: string): string {
  const lines = srt.split('\n');
  const textLines: string[] = [];
  let skipNext = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip sequence numbers (just digits)
    if (/^\d+$/.test(trimmed)) {
      continue;
    }
    
    // Skip timestamp lines (00:00:00,000 --> 00:00:00,000)
    if (/^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/.test(trimmed)) {
      continue;
    }

    // Skip empty lines
    if (trimmed === '') {
      continue;
    }

    // This is actual text content
    textLines.push(trimmed);
  }

  return textLines.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse VTT format to plain text
 * VTT format similar to SRT but with WEBVTT header
 */
function parseVttToText(vtt: string): string {
  const lines = vtt.split('\n');
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip WEBVTT header and metadata
    if (trimmed.startsWith('WEBVTT') || trimmed.startsWith('NOTE') || trimmed.startsWith('STYLE')) {
      continue;
    }

    // Skip cue identifiers (if present)
    if (/^[\w-]+$/.test(trimmed) && !trimmed.includes(' ')) {
      continue;
    }

    // Skip timestamp lines (00:00:00.000 --> 00:00:00.000)
    if (/^\d{2}:\d{2}[:\.]?\d{0,2}[,\.]?\d{0,3}\s*-->\s*\d{2}:\d{2}[:\.]?\d{0,2}[,\.]?\d{0,3}/.test(trimmed)) {
      continue;
    }

    // Skip empty lines
    if (trimmed === '') {
      continue;
    }

    // Strip VTT tags like <v Speaker Name>, <c>, </c>, etc.
    const cleanedLine = trimmed
      .replace(/<v\s+[^>]+>/gi, '')  // Voice tags
      .replace(/<\/v>/gi, '')
      .replace(/<c[^>]*>/gi, '')     // Class tags
      .replace(/<\/c>/gi, '')
      .replace(/<[^>]+>/g, '')       // Any other tags
      .trim();

    if (cleanedLine) {
      textLines.push(cleanedLine);
    }
  }

  return textLines.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse JSON transcript formats (various schemas)
 */
function parseJsonTranscript(json: string): string {
  try {
    const data = JSON.parse(json);
    
    // Handle array of segments
    if (Array.isArray(data)) {
      return data
        .map((item: unknown) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>;
            return obj.text || obj.transcript || obj.content || '';
          }
          return '';
        })
        .filter(Boolean)
        .join(' ');
    }

    // Handle object with segments/utterances array
    if (data.segments || data.utterances || data.results) {
      const segments = data.segments || data.utterances || data.results;
      if (Array.isArray(segments)) {
        return segments
          .map((s: unknown) => {
            if (typeof s === 'object' && s !== null) {
              const obj = s as Record<string, unknown>;
              return obj.text || obj.transcript || '';
            }
            return '';
          })
          .filter(Boolean)
          .join(' ');
      }
    }

    // Handle object with direct text/transcript field
    if (data.text) return String(data.text);
    if (data.transcript) return String(data.transcript);

    // Fallback - stringify and clean
    return JSON.stringify(data);
  } catch {
    return json; // Return as-is if not valid JSON
  }
}

export async function ensureTranscript(
  episodeId: string,
  audioUrl: string,
  language = 'en',
  transcriptUrl?: string  // NEW: Optional RSS transcript URL (FREE option!)
): Promise<{
  status: TranscriptStatus;
  text?: string;
  transcript?: DiarizedTranscript;
  error?: string;
}> {
  const startTime = Date.now();
  logWithTime('ensureTranscript started', { 
    episodeId, 
    audioUrl: audioUrl.substring(0, 80) + '...', 
    language,
    hasTranscriptUrl: !!transcriptUrl 
  });

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
      // Also return diarized_json if available
      const diarizedTranscript = existing.diarized_json as DiarizedTranscript | null;
      return {
        status: 'ready',
        text: existing.full_text,
        transcript: diarizedTranscript || undefined
      };
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
    let transcriptText: string | null = null;
    let provider = 'deepgram';
    let diarizedTranscript: DiarizedTranscript | null = null;

    // ============================================
    // PRIORITY A: Try to fetch transcript from RSS URL (FREE!)
    // ============================================
    if (transcriptUrl) {
      logWithTime('PRIORITY A: Attempting FREE transcript fetch from RSS URL...');
      transcriptText = await fetchTranscriptFromUrl(transcriptUrl);
      
      if (transcriptText && transcriptText.length > 100) {
        provider = 'rss-transcript';
        logWithTime('SUCCESS: Got FREE transcript from RSS!', { 
          textLength: transcriptText.length,
          saved: 'Deepgram API costs'
        });
        
        // Create a simple diarized transcript structure for RSS transcripts
        diarizedTranscript = {
          utterances: [{
            start: 0,
            end: 0,
            speaker: 0,
            text: transcriptText,
            confidence: 1.0
          }],
          fullText: transcriptText,
          duration: 0,
          speakerCount: 1,
          detectedLanguage: language
        };
      } else {
        logWithTime('PRIORITY A FAILED: RSS transcript fetch failed or too short, falling back to Deepgram');
      }
    }

    // ============================================
    // PRIORITY B: Use Deepgram with explicit language (if no RSS transcript)
    // ============================================
    if (!transcriptText) {
      logWithTime('PRIORITY B: Starting transcription via Deepgram with explicit language...');
      const transcribeStart = Date.now();
      
      // ALWAYS pass language explicitly to Deepgram - this avoids paying for language detection
      // and improves transcription accuracy
      logWithTime('Passing explicit language to Deepgram', { language });
      diarizedTranscript = await transcribeFromUrl(audioUrl, language);
      
      const formattedText = formatTranscriptWithTimestamps(diarizedTranscript);
      logWithTime('Deepgram transcription completed', {
        durationMs: Date.now() - transcribeStart,
        durationSec: ((Date.now() - transcribeStart) / 1000).toFixed(1),
        textLength: formattedText.length,
        utteranceCount: diarizedTranscript.utterances.length,
        speakerCount: diarizedTranscript.speakerCount,
        detectedLanguage: diarizedTranscript.detectedLanguage
      });

      // Check if transcription produced any content
      if (!diarizedTranscript.fullText || diarizedTranscript.fullText.trim().length === 0) {
        const errorMsg = 'Transcription returned empty - audio may be unsupported or corrupted';
        logWithTime('Transcription returned empty content', { 
          utteranceCount: diarizedTranscript.utterances.length,
          fullTextLength: diarizedTranscript.fullText?.length || 0
        });
        await supabase
          .from('transcripts')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('episode_id', episodeId)
          .eq('language', language);
        return { status: 'failed', error: errorMsg };
      }

      // Identify speakers using LLM
      logWithTime('Identifying speakers with LLM...');
      const speakers = await identifySpeakers(diarizedTranscript);
      diarizedTranscript.speakers = speakers;

      // Re-format transcript with identified speaker names
      transcriptText = formatTranscriptWithSpeakerNames(diarizedTranscript);
    }

    // Save transcript to DB (language is known from RSS feed)
    logWithTime('Saving transcript to DB...', { provider, language });
    const saveStart = Date.now();
    await supabase
      .from('transcripts')
      .update({
        status: 'ready',
        full_text: transcriptText,
        diarized_json: diarizedTranscript,
        provider
      })
      .eq('episode_id', episodeId)
      .eq('language', language);
    logWithTime('Transcript saved', { durationMs: Date.now() - saveStart });

    logWithTime('ensureTranscript completed successfully', { 
      totalDurationMs: Date.now() - startTime,
      language,
      provider,
      wasFree: provider === 'rss-transcript'
    });
    return { status: 'ready', text: transcriptText, transcript: diarizedTranscript || undefined };
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
  language = 'en',
  _diarizedTranscript?: DiarizedTranscript // Keep for future use, not used in simple approach
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
    // Get the appropriate model based on level
    // Deep uses Pro (more capable), Quick uses Flash (faster, cheaper)
    const selectedModel = getModelForLevel(level);
    const modelName = level === 'deep' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const prompt = level === 'quick' ? QUICK_PROMPT : DEEP_PROMPT;
    
    // Use up to 150k characters of transcript (leaves room for prompt and response)
    const maxTranscriptChars = 150000;
    const truncatedTranscript = transcriptText.length > maxTranscriptChars 
      ? transcriptText.substring(0, maxTranscriptChars) + '\n\n[... transcript truncated for length ...]'
      : transcriptText;
    
    const inputLength = (prompt + truncatedTranscript).length;
    logWithTime(`Generating ${level.toUpperCase()} Summary via Gemini...`, { 
      model: modelName,
      level,
      inputLength,
      transcriptTruncated: transcriptText.length > maxTranscriptChars
    });

    const apiStart = Date.now();
    const fullPrompt = SYSTEM_MESSAGE + "\n\n" + prompt + truncatedTranscript;
    
    const result = await selectedModel.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();
    
    logWithTime(`Gemini API completed for ${level.toUpperCase()} Summary`, {
      model: modelName,
      durationMs: Date.now() - apiStart,
      durationSec: ((Date.now() - apiStart) / 1000).toFixed(1)
    });

    logWithTime('Parsing JSON response...', { responseLength: text.length });

    // Try to extract JSON from the response (in case model added text before/after)
    let jsonText = text.trim();

    // If response doesn't start with {, try to find JSON in the response
    if (!jsonText.startsWith('{')) {
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        logWithTime('Extracted JSON from wrapped response');
        jsonText = jsonMatch[0];
      } else {
        logWithTime('No JSON found in response', { responsePreview: text.substring(0, 500) });
        throw new Error('No JSON object found in response');
      }
    }

    const content = JSON.parse(jsonText) as QuickSummaryContent | DeepSummaryContent;

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

    logWithTime('generateSummaryForLevel completed successfully', { 
      level,
      totalDurationMs: Date.now() - startTime,
      totalDurationSec: ((Date.now() - startTime) / 1000).toFixed(1)
    });
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
  language = 'en',
  transcriptUrl?: string  // NEW: Optional RSS transcript URL for FREE transcription
): Promise<{ status: SummaryStatus; content?: QuickSummaryContent | DeepSummaryContent }> {
  const startTime = Date.now();
  logWithTime('=== requestSummary STARTED ===', { episodeId, level, language, hasTranscriptUrl: !!transcriptUrl });

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
  logWithTime('Calling ensureTranscript...', { hasTranscriptUrl: !!transcriptUrl });
  const transcriptResult = await ensureTranscript(episodeId, audioUrl, language, transcriptUrl);
  logWithTime('ensureTranscript returned', { status: transcriptResult.status, hasText: !!transcriptResult.text, hasTranscript: !!transcriptResult.transcript, error: transcriptResult.error });

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

  // Generate the summary (language is known from RSS feed)
  logWithTime('Calling generateSummaryForLevel...', { language });
  const result = await generateSummaryForLevel(
    episodeId,
    level,
    transcriptResult.text,
    language,
    transcriptResult.transcript
  );
  logWithTime('=== requestSummary ENDED ===', { 
    status: result.status, 
    language,
    totalDurationMs: Date.now() - startTime, 
    totalDurationSec: ((Date.now() - startTime) / 1000).toFixed(1) 
  });
  return result;
}

export async function getSummariesStatus(episodeId: string, language = 'en') {
  // Find transcript in ANY language for this episode (handles auto-detected languages)
  const { data: transcripts } = await supabase
    .from('transcripts')
    .select('status, language')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: false });

  const transcript = transcripts?.[0] || null;
  const actualLanguage = transcript?.language || language;

  // Fetch summaries with the actual language
  const { data: summaries } = await supabase
    .from('summaries')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('language', actualLanguage)
    .in('level', ['quick', 'deep']);

  const quick = summaries?.find(s => s.level === 'quick');
  const deep = summaries?.find(s => s.level === 'deep');

  return {
    episodeId,
    detected_language: actualLanguage,
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
