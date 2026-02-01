# AI Prompts Reference - PodCatch Summarization System

This document describes all AI prompts used in the PodCatch summarization pipeline. These prompts control how Claude (Anthropic) processes podcast transcripts to generate summaries, insights, and analysis.

## System Architecture Overview

```
                              ┌─────────────────┐
                              │  Audio File     │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │   Deepgram      │
                              │  (Transcribe)   │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Speaker ID      │
                              │   Prompt        │
                              └────────┬────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │  QUICK_PROMPT   │    │  DEEP_PROMPT    │    │ INSIGHTS_PROMPT │
    │  (Quick Summary)│    │ (Deep Summary)  │    │   (Insights)    │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## File Locations

| File | Prompts |
|------|---------|
| `src/lib/summary-service.ts` | Speaker ID, Quick Summary, Deep Summary |
| `src/lib/insights-service.ts` | Insights generation |

---

## 1. SPEAKER_ID_PROMPT

**Location:** `src/lib/summary-service.ts`  
**Purpose:** Identify speaker names and roles from transcript  
**Model:** Claude Sonnet 4

### Prompt

```
Analyze this podcast transcript and identify the speakers.

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
```

### Input
- First ~5 minutes of transcript (where introductions happen)
- Some samples from middle (for name mentions)
- Max 15,000 characters

### Output Schema
```typescript
interface IdentifiedSpeaker {
  id: number;          // Speaker number from Deepgram
  name: string;        // Extracted name or "Host"/"Guest"
  role: 'host' | 'guest' | 'unknown';
}
```

### Behavior
- Called automatically after transcription
- Re-formats transcript with real names instead of "Speaker 0", "Speaker 1"
- Falls back to "Host", "Guest 1", "Guest 2" if names not found

---

## 2. QUICK_PROMPT

**Location:** `src/lib/summary-service.ts`  
**Purpose:** Generate concise "at a glance" summary  
**Model:** Claude Sonnet 4  
**Max Tokens:** 2,000

### System Message

```
You are a JSON-only response bot. You MUST respond with ONLY valid JSON - no explanations, 
no markdown, no text before or after the JSON. Start your response with { and end with }. 
Never say "Based on" or any other text.

CRITICAL: You MUST detect the language of the transcript and respond in THE SAME LANGUAGE. 
This works for ANY language - Hebrew, Spanish, French, German, Japanese, Arabic, Portuguese, 
Russian, Chinese, or any other. Match the transcript language exactly.
```

### Prompt

```
Return ONLY a JSON object (no text, no markdown) with this exact structure:

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
- IMPORTANT: Write ALL content (tldr, takeaways, topics, etc.) in the SAME LANGUAGE as the transcript

Transcript:
```

### Output Schema
```typescript
interface QuickSummaryContent {
  tldr: string;              // 2 sentences max
  key_takeaways: string[];   // 5-7 bullet points
  who_is_this_for: string;   // Target audience
  topics: string[];          // 3-5 topic tags
}
```

### Use Case
- Quick decision: "Should I listen to this episode?"
- Browse/discovery views
- Fast generation (~10-15 seconds)

---

## 3. DEEP_PROMPT

**Location:** `src/lib/summary-service.ts`  
**Purpose:** Generate comprehensive episode analysis  
**Model:** Claude Sonnet 4  
**Max Tokens:** 8,000

### Prompt

```
Return ONLY a JSON object (no text, no markdown) with this exact structure:

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
- IMPORTANT: Write ALL content in the SAME LANGUAGE as the transcript
```

### Output Schema
```typescript
interface DeepSummaryContent {
  tldr: string;
  sections: Array<{
    title: string;
    summary: string;
    key_points: string[];
  }>;
  resources: Array<{
    type: 'repo' | 'link' | 'tool' | 'person' | 'paper' | 'other';
    label: string;
    url?: string;
    notes?: string;
  }>;
  action_prompts: Array<{
    title: string;
    details: string;
  }>;
  topics: string[];
}
```

### Use Case
- Detailed episode page
- Skip-the-listen comprehensive view
- Extract actionable resources and next steps

### Special Behavior
- When Deep summary completes, automatically derives a Quick summary from it (no extra API call)

---

## 4. INSIGHTS_PROMPT

**Location:** `src/lib/insights-service.ts`  
**Purpose:** Generate advanced analytics (keywords, highlights, mindmap, shownotes)  
**Model:** Claude Sonnet 4  
**Max Tokens:** 4,000

### System Message

```
You are a JSON-only response bot. Respond with ONLY valid JSON. 
CRITICAL: Detect the language of the transcript and respond in THE SAME LANGUAGE - 
whether Hebrew, Spanish, French, Japanese, Arabic, or any other language. Match exactly.
```

### Prompt

```
Analyze this podcast transcript and generate comprehensive insights in JSON format.

Return a JSON object with this EXACT structure:

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
- Keywords: Extract 15-25 most important terms/phrases. Relevance: "high", "medium", or "low".
- Highlights: 8-12 key quotes that capture the essence of the episode.
- Shownotes: Create 5-8 logical chapters/sections covering the episode flow.
- Mindmap: 2-3 level hierarchy, max 15 nodes total.
- No hallucinated content - extract only what's in the transcript.
- Keep quotes concise but meaningful (1-3 sentences max).
- CRITICAL: Write ALL content in the SAME LANGUAGE as the transcript.
```

### Output Schema
```typescript
interface InsightsContent {
  keywords: Array<{
    word: string;
    frequency: number;
    relevance: 'high' | 'medium' | 'low';
  }>;
  highlights: Array<{
    quote: string;
    timestamp?: string;
    context?: string;
    importance: 'critical' | 'important' | 'notable';
  }>;
  shownotes: Array<{
    timestamp?: string;
    title: string;
    content: string;
    links?: Array<{ label: string; url: string }>;
  }>;
  mindmap: {
    id: string;
    label: string;
    children?: MindmapNode[];
  };
  generated_at: string;
}
```

### Use Case
- Insights Hub visualization
- Keyword cloud / frequency analysis
- Quotable highlights extraction
- Visual mindmap rendering (Mermaid)
- Auto-generated chapter markers

---

## Common Patterns Across All Prompts

### 1. JSON-Only Enforcement

All prompts include strict JSON enforcement:
- System message: "You are a JSON-only response bot"
- Prompt: "Return ONLY a JSON object (no text, no markdown)"
- Rule: "Start response with { and end with }"

### 2. Multi-Language Support

All prompts include:
```
CRITICAL: Write ALL content in the SAME LANGUAGE as the transcript - 
whether Hebrew, Spanish, French, Japanese, Arabic, or any other language. 
Match the transcript language exactly.
```

### 3. No Hallucination Rules

- "Only include resources actually mentioned"
- "No hallucinated content - extract only what's in the transcript"
- "omit url field if not stated"

### 4. Fallback JSON Extraction

Code handles cases where model adds extra text:
```typescript
let jsonText = response.trim();
if (!jsonText.startsWith('{')) {
  const match = jsonText.match(/\{[\s\S]*\}/);
  if (match) jsonText = match[0];
}
```

---

## Token Limits & Truncation

| Prompt | Max Input | Max Output | Notes |
|--------|-----------|------------|-------|
| Speaker ID | 15,000 chars | 1,000 tokens | Samples from beginning + middle |
| Quick | 150,000 chars | 2,000 tokens | Truncates with notice |
| Deep | 150,000 chars | 8,000 tokens | Truncates with notice |
| Insights | 100,000 chars | 4,000 tokens | - |

---

## Modifying Prompts

### Best Practices

1. **Keep JSON structure stable** - UI components depend on exact field names
2. **Test with multiple languages** - Ensure non-English transcripts work
3. **Validate output** - Add fallback defaults for missing fields
4. **Log responses** - Debug with `logWithTime()` to track issues

### Adding New Fields

1. Update the prompt's JSON example
2. Update the TypeScript interface in `src/types/database.ts`
3. Update validation function if exists
4. Update UI components that consume the data

### Testing Changes

```bash
# Monitor logs during generation
npm run dev

# Check the summary service logs
[SUMMARY-SERVICE timestamp] message { data }
```
