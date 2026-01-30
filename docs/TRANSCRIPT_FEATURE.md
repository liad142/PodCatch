# Premium Transcript Feature - Implementation Guide

## Overview

The new transcript UI transforms the basic text display into a **premium, conversation-style interface** with modern aesthetics inspired by audio tools and premium podcast apps.

## Design Philosophy

**"Audio Waveform Narrative"** - A sophisticated editorial design that treats transcripts as flowing narratives with visual rhythm.

### Key Visual Elements:
- **Waveform-inspired rhythm**: Varying speaker bubble sizes create visual flow
- **Elegant typography**: Crimson Text (serif) for readability + Outfit (sans-serif) for UI
- **Liquid gradients**: Subtle background gradients that adapt to theme
- **Color-coded speakers**: Each speaker gets a unique vibrant color
- **Smooth animations**: Staggered entrance animations and hover effects

## Features

### 1. **Speaker Detection & Identification**
- Automatically parses transcripts to detect speakers
- Supports multiple speaker formats:
  - `Speaker 1: text`
  - `[00:12:34] Speaker Name: text`
  - Plain timestamps with text
- **Speaker Identifier Modal**: Users can assign real names to detected speakers
- Visual speaker differentiation with colored avatars

### 2. **Advanced Search**
- Real-time search across conversation
- Highlights matches with animated yellow highlighting
- Search count display
- Searches both speaker names and text content

### 3. **Speaker Filtering**
- Filter view by individual speakers
- Visual speaker pills with color coding
- One-click toggle to show/hide speakers
- "All" option to view complete conversation

### 4. **Conversation Layout**
- Message grouping (consecutive messages from same speaker)
- Timestamp display for each speaker segment
- Avatar with gradient glow effect
- Speech bubble-style message cards with tail
- First messages get prominent styling

### 5. **Interactive Features**
- Copy entire transcript
- Download as .txt file
- Smooth scroll behavior
- Hover effects on messages
- Loading skeleton states
- Empty state with animated waveform

### 6. **Statistics Footer**
- Speaker count
- Segment count
- Word count

## File Structure

```
src/
├── components/
│   └── insights/
│       ├── TranscriptTabContent.tsx    # Main container
│       ├── TranscriptMessage.tsx       # Individual message component
│       └── SpeakerIdentifier.tsx       # Speaker naming modal
├── types/
│   └── transcript.ts                   # TypeScript interfaces
└── app/
    └── layout.tsx                      # Font configuration
```

## TypeScript Types

```typescript
interface ParsedTranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp?: string;
}

interface SpeakerInfo {
  name: string;          // Current display name
  color: string;         // Hex color for UI
  avatar: string;        // Single letter avatar
  realName?: string;     // User-provided actual name
}
```

## Database Schema (Recommended)

To persist speaker identifications, add this table:

```sql
CREATE TABLE transcript_speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL,          -- "Speaker 1", "Unknown Speaker"
  identified_name TEXT,                 -- User-provided name
  color TEXT NOT NULL,                  -- Hex color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(episode_id, speaker_label)
);

CREATE INDEX idx_transcript_speakers_episode ON transcript_speakers(episode_id);
```

## API Route (TODO)

Create `/api/episodes/[id]/speakers/route.ts`:

```typescript
// GET - Fetch saved speaker names for an episode
// PUT - Update speaker name
// POST - Create new speaker mapping

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { data, error } = await supabase
    .from('transcript_speakers')
    .select('*')
    .eq('episode_id', id);

  return Response.json({ speakers: data });
}

export async function PUT(request: Request) {
  const { episodeId, speakerLabel, identifiedName } = await request.json();

  const { data, error } = await supabase
    .from('transcript_speakers')
    .upsert({
      episode_id: episodeId,
      speaker_label: speakerLabel,
      identified_name: identifiedName,
      updated_at: new Date().toISOString()
    });

  return Response.json({ success: true });
}
```

## Styling Highlights

### Colors Used:
- **Speakers**: Pink, Teal, Yellow, Mint, Lavender, Coral, Seafoam, Peach
- **Accent**: Indigo (#6366f1)
- **Background**: Gradient from #fafbfc to #f5f7fa
- **Dark mode**: Gradient from #0a0b0d to #12141a

### Animations:
- **slideIn**: Message entrance (0.6s cubic-bezier)
- **pulse**: Avatar glow effect (3s infinite)
- **wave**: Transcribing loader (1.2s stagger)

### Fonts:
- **Crimson Text**: 400, 600, 700 weights for message text
- **Outfit**: Variable weight for UI elements
- **Inter**: Base font (already in project)

## Integration Steps

1. ✅ Created TypeScript types
2. ✅ Built TranscriptMessage component
3. ✅ Built SpeakerIdentifier modal
4. ✅ Updated TranscriptTabContent with new UI
5. ✅ Added fonts to layout.tsx
6. ⏳ **TODO**: Create speaker persistence API
7. ⏳ **TODO**: Add database migration
8. ⏳ **TODO**: Connect SpeakerIdentifier to API

## Usage

The component automatically:
- Parses transcript text for speakers
- Assigns colors to each unique speaker
- Groups consecutive messages
- Handles search and filtering
- Provides copy/download functionality

### Manual Speaker Identification:
1. Click "Identify Speakers" button
2. Modal opens showing all detected speakers
3. Enter real names for each speaker
4. Click "Save Changes"
5. Names update throughout transcript
6. **(When API is connected)** Names persist to database

## Browser Support

- Modern browsers with CSS Grid, Flexbox, and backdrop-filter support
- Animated with CSS transitions and keyframes
- Responsive design for mobile and desktop
- Dark mode support

## Performance Considerations

- Uses `useMemo` for filtered segments
- Lazy parsing of transcript (only when needed)
- Staggered animations prevent layout jank
- Virtual scrolling could be added for extremely long transcripts (1000+ segments)

## Future Enhancements

1. **Timestamp Navigation**: Click timestamp to jump in audio player
2. **Speaker Search**: Filter by speaker in search
3. **Export Options**: PDF, formatted HTML, markdown
4. **AI Speaker Detection**: Use voice analysis to auto-identify speakers
5. **Collaborative Editing**: Multiple users can identify speakers
6. **Speaker Stats**: Show speaking time, word count per speaker
7. **Highlight Sharing**: Share specific quotes with timestamps
8. **Voice Waveform Visualization**: Show audio waveform alongside text

## Credits

- Design inspired by: Spotify, Otter.ai, Descript
- Typography: Google Fonts (Crimson Text, Outfit)
- Icons: Lucide React
- Built with: Next.js 14, TypeScript, Tailwind CSS
