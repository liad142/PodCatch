import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import { ensureTranscript } from "./summary-service";
import type {
  InsightStatus,
  InsightsContent,
  KeywordItem,
  HighlightItem,
  ShownotesSection,
  MindmapNode
} from "@/types/database";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-3-flash-preview",
  generationConfig: {
    responseMimeType: "application/json"
  }
});

// Prompt for generating all insights at once
const INSIGHTS_PROMPT = `Analyze this podcast transcript and generate comprehensive insights in JSON format.

Return a JSON object with this EXACT structure (no markdown, just valid JSON):

{
  "keywords": [
    {
      "word": "keyword or short phrase",
      "frequency": 5,
      "relevance": "high"
    }
  ],
  "highlights": [
    {
      "quote": "Exact or near-exact quote from transcript that captures a key moment",
      "context": "Brief context explaining why this quote matters",
      "importance": "critical"
    }
  ],
  "shownotes": [
    {
      "title": "Chapter/Section title",
      "content": "Brief description of what's covered in this section"
    }
  ],
  "mindmap": {
    "id": "root",
    "label": "Episode Main Topic",
    "children": [
      {
        "id": "topic1",
        "label": "Subtopic 1",
        "children": [
          {"id": "topic1.1", "label": "Detail 1"}
        ]
      }
    ]
  }
}

RULES:
- Keywords: Extract 15-25 most important terms/phrases. Relevance: "high", "medium", or "low". Frequency is rough estimate.
- Highlights: 8-12 key quotes that capture the essence of the episode. Importance: "critical", "important", or "notable".
- Shownotes: Create 5-8 logical chapters/sections covering the episode flow.
- Mindmap: 2-3 level hierarchy, max 15 nodes total. The root label should be the episode's main theme.
- Only include timestamps if clearly identifiable in the transcript.
- Only include links in shownotes if explicitly mentioned with full URLs.
- No hallucinated content - extract only what's in the transcript.
- Keep quotes concise but meaningful (1-3 sentences max).
- CRITICAL: Write ALL content (keywords, highlights, shownotes, mindmap labels) in the SAME LANGUAGE as the transcript - whether Hebrew, Spanish, French, Japanese, Arabic, or any other language. Match the transcript language exactly.

Transcript:
`;

export async function generateInsights(
  episodeId: string,
  transcriptText: string,
  language = 'en'
): Promise<{ status: InsightStatus; content?: InsightsContent; error?: string }> {

  // Update status to summarizing (generating)
  await supabase
    .from('summaries')
    .update({ status: 'summarizing' })
    .eq('episode_id', episodeId)
    .eq('level', 'insights')
    .eq('language', language);

  try {
    const systemPrompt = "You are a JSON-only response bot. Respond with ONLY valid JSON. CRITICAL: Detect the language of the transcript and respond in THE SAME LANGUAGE - whether Hebrew, Spanish, French, Japanese, Arabic, or any other language. Match exactly.";
    const fullPrompt = systemPrompt + "\n\n" + INSIGHTS_PROMPT + transcriptText.substring(0, 100000);
    
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // Parse and validate the response
    const rawContent = JSON.parse(text);

    // Ensure required fields exist with defaults
    const content: InsightsContent = {
      keywords: validateKeywords(rawContent.keywords || []),
      highlights: validateHighlights(rawContent.highlights || []),
      shownotes: validateShownotes(rawContent.shownotes || []),
      mindmap: validateMindmap(rawContent.mindmap || { id: 'root', label: 'Episode Overview' }),
      generated_at: new Date().toISOString()
    };

    await supabase
      .from('summaries')
      .update({
        status: 'ready',
        content_json: content,
        error_message: null
      })
      .eq('episode_id', episodeId)
      .eq('level', 'insights')
      .eq('language', language);

    return { status: 'ready', content };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Insights generation failed';
    await supabase
      .from('summaries')
      .update({ status: 'failed', error_message: errorMsg })
      .eq('episode_id', episodeId)
      .eq('level', 'insights')
      .eq('language', language);

    return { status: 'failed', error: errorMsg };
  }
}

function validateKeywords(keywords: unknown[]): KeywordItem[] {
  return keywords.slice(0, 30).map((k: unknown) => {
    const keyword = k as Record<string, unknown>;
    return {
      word: String(keyword.word || ''),
      frequency: Number(keyword.frequency) || 1,
      relevance: (['high', 'medium', 'low'].includes(keyword.relevance as string)
        ? keyword.relevance as 'high' | 'medium' | 'low'
        : 'medium')
    };
  }).filter(k => k.word.length > 0);
}

function validateHighlights(highlights: unknown[]): HighlightItem[] {
  return highlights.slice(0, 15).map((h: unknown) => {
    const highlight = h as Record<string, unknown>;
    return {
      quote: String(highlight.quote || ''),
      timestamp: highlight.timestamp ? String(highlight.timestamp) : undefined,
      context: highlight.context ? String(highlight.context) : undefined,
      importance: (['critical', 'important', 'notable'].includes(highlight.importance as string)
        ? highlight.importance as 'critical' | 'important' | 'notable'
        : 'notable')
    };
  }).filter(h => h.quote.length > 0);
}

function validateShownotes(shownotes: unknown[]): ShownotesSection[] {
  return shownotes.slice(0, 12).map((s: unknown) => {
    const section = s as Record<string, unknown>;
    return {
      timestamp: section.timestamp ? String(section.timestamp) : undefined,
      title: String(section.title || 'Section'),
      content: String(section.content || ''),
      links: Array.isArray(section.links)
        ? section.links.map((l: unknown) => {
            const link = l as Record<string, unknown>;
            return {
              label: String(link.label || ''),
              url: String(link.url || '')
            };
          }).filter(l => l.label && l.url)
        : undefined
    };
  });
}

function validateMindmap(mindmap: unknown): MindmapNode {
  const node = mindmap as Record<string, unknown>;
  return {
    id: String(node.id || 'root'),
    label: String(node.label || 'Episode Overview'),
    children: Array.isArray(node.children)
      ? node.children.slice(0, 10).map((c: unknown) => validateMindmap(c))
      : undefined
  };
}

export async function requestInsights(
  episodeId: string,
  audioUrl: string,
  language = 'en',
  transcriptUrl?: string  // NEW: Optional RSS transcript URL for FREE transcription
): Promise<{ status: InsightStatus; content?: InsightsContent }> {

  // Check existing insights (look in any language first)
  const { data: existingList } = await supabase
    .from('summaries')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('level', 'insights')
    .order('created_at', { ascending: false });

  const existing = existingList?.[0] || null;

  if (existing) {
    if (existing.status === 'ready' && existing.content_json) {
      return { status: 'ready', content: existing.content_json as InsightsContent };
    }
    if (['queued', 'transcribing', 'summarizing'].includes(existing.status)) {
      return { status: existing.status as InsightStatus };
    }
    // If failed or not_ready, we'll try again
  }

  // Create insights record as queued (with requested language initially)
  await supabase
    .from('summaries')
    .upsert({
      episode_id: episodeId,
      level: 'insights',
      language,
      status: 'queued',
      updated_at: new Date().toISOString()
    }, { onConflict: 'episode_id,level,language' });

  // Ensure transcript exists (passing transcriptUrl for FREE transcription if available)
  const transcriptResult = await ensureTranscript(episodeId, audioUrl, language, transcriptUrl);

  if (transcriptResult.status !== 'ready' || !transcriptResult.text) {
    const insightStatus: InsightStatus = transcriptResult.status === 'failed' ? 'failed' : 'transcribing';
    await supabase
      .from('summaries')
      .update({
        status: insightStatus,
        error_message: transcriptResult.error || null
      })
      .eq('episode_id', episodeId)
      .eq('level', 'insights')
      .eq('language', language);

    return { status: insightStatus };
  }

  // Generate insights (language is known from RSS feed)
  return generateInsights(episodeId, transcriptResult.text, language);
}

export async function getInsightsStatus(episodeId: string, language = 'en') {
  // First, try to find a transcript for this episode in ANY language
  // This handles auto-detected languages (e.g., Hebrew detected from English request)
  const { data: transcripts } = await supabase
    .from('transcripts')
    .select('status, language, full_text')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: false });

  // Use the first (most recent) transcript, or fall back to requested language lookup
  const transcript = transcripts?.[0] || null;
  const actualLanguage = transcript?.language || language;

  // Now fetch insights and summaries with the actual language
  const { data: insights } = await supabase
    .from('summaries')
    .select('*')
    .eq('episode_id', episodeId)
    .eq('level', 'insights')
    .eq('language', actualLanguage)
    .single();

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
    transcript_status: transcript?.status || 'not_started',
    transcript_text: transcript?.status === 'ready' ? transcript.full_text : undefined,
    detected_language: actualLanguage,
    insights: insights ? {
      status: insights.status as InsightStatus,
      content: insights.status === 'ready' ? insights.content_json as InsightsContent : undefined,
      updated_at: insights.updated_at
    } : undefined,
    summaries: {
      quick: quick ? {
        status: quick.status,
        content: quick.status === 'ready' ? quick.content_json : undefined,
        updated_at: quick.updated_at
      } : undefined,
      deep: deep ? {
        status: deep.status,
        content: deep.status === 'ready' ? deep.content_json : undefined,
        updated_at: deep.updated_at
      } : undefined
    }
  };
}
