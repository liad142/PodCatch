# Multi-Level Summaries System

## Overview

PodCatch supports two summary levels for podcast episodes:
- **Quick**: A fast scan (~30 seconds to read) with TL;DR, key takeaways, and topic tags
- **Deep**: A structured analysis with sections, resources, and actionable next steps

Both summaries are generated from the same transcript, which is created once per episode.

## Data Model

### Transcripts Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| episode_id | TEXT | Reference to episode |
| language | TEXT | Language code (default: 'en') |
| status | ENUM | not_ready, queued, transcribing, ready, failed |
| full_text | TEXT | The transcript text |
| provider | TEXT | Transcription service (e.g., 'groq') |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Unique Constraint**: (episode_id, language)

### Summaries Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| episode_id | TEXT | Reference to episode |
| level | ENUM | 'quick' or 'deep' |
| language | TEXT | Language code (default: 'en') |
| status | ENUM | not_ready, queued, transcribing, summarizing, ready, failed |
| content_json | JSONB | Structured summary content |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Unique Constraint**: (episode_id, level, language)

## Status Lifecycle

```
[not_ready] -> [queued] -> [transcribing] -> [summarizing] -> [ready]
                              |                    |
                              v                    v
                          [failed]             [failed]
```

### Status Descriptions
- **not_ready**: Summary hasn't been requested yet
- **queued**: Request received, waiting to start
- **transcribing**: Audio is being transcribed (transcript doesn't exist yet)
- **summarizing**: Transcript ready, generating summary
- **ready**: Summary available
- **failed**: An error occurred (check error_message)

## API Endpoints

### GET /api/episodes/:episodeId/summaries

Returns both summary levels with their statuses.

**Response:**
```json
{
  "episodeId": "abc123",
  "transcript": {
    "status": "ready",
    "language": "en"
  },
  "summaries": {
    "quick": {
      "status": "ready",
      "content": { /* QuickSummaryContent */ },
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "deep": {
      "status": "not_ready",
      "content": null
    }
  }
}
```

### POST /api/episodes/:episodeId/summaries

Request summary generation. **Idempotent**: returns existing summary if ready.

**Request:**
```json
{
  "level": "quick",  // or "deep"
  "language": "en"   // optional, defaults to "en"
}
```

**Response (if ready):**
```json
{
  "episodeId": "abc123",
  "level": "quick",
  "status": "ready",
  "content": { /* summary content */ }
}
```

**Response (if processing):**
```json
{
  "episodeId": "abc123",
  "level": "quick",
  "status": "transcribing"
}
```

### GET /api/episodes/:episodeId/summaries/status

Polling endpoint for checking status during generation.

**Query Params:**
- `language` (optional): Language code, defaults to "en"

**Response:** Same as GET /summaries

## JSON Schemas

### Quick Summary (QuickSummaryContent)
```json
{
  "tldr": "2 sentences max summarizing the episode",
  "key_takeaways": [
    "First key point",
    "Second key point",
    "..."
  ],
  "who_is_this_for": "Ideal listener description in one sentence",
  "topics": ["topic1", "topic2", "topic3"]
}
```

### Deep Summary (DeepSummaryContent)
```json
{
  "tldr": "2 sentences max summarizing the episode",
  "sections": [
    {
      "title": "Section Title",
      "summary": "2-4 sentences summarizing this section",
      "key_points": ["point 1", "point 2"]
    }
  ],
  "resources": [
    {
      "type": "repo|link|tool|person|paper|other",
      "label": "Human readable name",
      "url": "https://... (optional)",
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
```

## Frontend UX

### Episode List
- Shows status badge: Ready / Processing / Failed
- Button text changes based on quick summary status:
  - Ready: "View Summary"
  - Processing: "Summarizing..."
  - Not ready: "Summarize"
  - Failed: "Retry"

### Summary Panel
- Tabs for Quick and Deep views
- Each tab shows:
  - Content if ready
  - Progress indicator if processing
  - CTA button if not started
- Automatic polling every 2.5s while processing
- Stop polling when ready or failed

## Generation Pipeline

1. User requests a summary (level=quick or deep)
2. System checks if summary already exists and is ready -> return it
3. System checks if summary is already processing -> return status
4. System creates summary record with status=queued
5. System ensures transcript exists:
   - If ready -> proceed to step 6
   - If not ready -> transcribe audio first (update summary status to transcribing)
6. System generates summary using Claude AI
7. System updates summary with content_json and status=ready

## Error Handling

- Transcript failures set both transcript and summary to failed status
- Summary failures only affect the specific summary level
- Retry is possible by POSTing again after a failure

## Implementation Notes

### Transcript Sharing
The transcript is created once and shared between Quick and Deep summaries. This means:
- First summary request triggers transcription
- Second summary request reuses existing transcript
- Significant cost and time savings

### Idempotency
All POST requests are idempotent:
- If summary exists and is ready, returns the existing summary
- If summary is processing, returns current status
- If summary failed, allows retry by resetting status

### Polling Best Practices
Frontend should:
- Poll every 2.5 seconds while status is `queued`, `transcribing`, or `summarizing`
- Stop polling when status is `ready` or `failed`
- Show appropriate UI feedback during each status phase
