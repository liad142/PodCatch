# Episode Insights: Vertical Smart Feed Implementation

**Date:** 2026-02-01
**Status:** In Progress

## Overview

Refactor the Episode Insights page from a tab-based interface to a continuous "Vertical Smart Feed" inspired by modern content apps.

## Architecture

### Three-Layer System

```
Layer 3 (z-40): QuickNav - Fixed right-4 top-1/2
Layer 2: Scrollable Vertical Feed (5 sections)
Layer 1 (z-50): StickyAudioPlayer - Fixed bottom-0 (existing)
```

### Component Structure

```
src/components/insights/
├── EpisodeSmartFeed.tsx        # Main orchestrator
├── InsightHero.tsx             # Section 1: Hook/Summary
├── MindmapTeaser.tsx           # Section 2: Visual breaker
├── HighlightsCarousel.tsx      # Section 3: Quote cards
├── TranscriptAccordion.tsx     # Section 4: Collapsible transcript
├── ActionFooter.tsx            # Section 5: CTAs
└── QuickNav.tsx                # Floating elevator nav
```

## Implementation Tasks

### Phase 1: Core Infrastructure
- [ ] Create `EpisodeSmartFeed.tsx` orchestrator with data fetching
- [ ] Update `page.tsx` to use new component
- [ ] Set up section refs and `data-section` attributes

### Phase 2: Feed Sections
- [ ] Build `InsightHero.tsx` with expandable summary
- [ ] Build `MindmapTeaser.tsx` with pan animation and modal
- [ ] Build `HighlightsCarousel.tsx` with horizontal scroll and timestamp seek
- [ ] Build `TranscriptAccordion.tsx` with search and segments
- [ ] Build `ActionFooter.tsx` with action buttons

### Phase 3: Navigation
- [ ] Build `QuickNav.tsx` with IntersectionObserver
- [ ] Add smooth scroll behavior
- [ ] Add active section highlighting

### Phase 4: Polish
- [ ] Add loading skeletons for each section
- [ ] Implement graceful fallbacks for missing data
- [ ] Add framer-motion animations
- [ ] Test responsive behavior
- [ ] Verify sticky player clearance (pb-28)

## Component Specifications

### 1. InsightHero (The Hook)

**Data Sources:**
- Primary: `summaries.quick.content.tldr`
- Expanded: `summaries.quick.content.key_takeaways`
- Tags: `summaries.quick.content.topics`
- Fallback: `episode.description` (truncated)

**Features:**
- Gradient background from podcast artwork dominant color
- "Read Full Summary" expand/collapse with animation
- Topic tags at bottom

### 2. MindmapTeaser (Visual Breaker)

**Data Sources:**
- `insights.content.mindmap`

**Features:**
- Fixed height viewport (~250px) with overflow hidden
- CSS pan animation (translateX 0 to -50px, 20s, infinite alternate)
- Semi-transparent overlay with "Explore Full Mindmap" CTA
- Opens existing MindmapTabContent in modal

### 3. HighlightsCarousel (Key Quotes)

**Data Sources:**
- `insights.content.highlights` array
- Each: `quote`, `timestamp`, `importance`, `context`

**Features:**
- Horizontal scroll with snap points
- Square cards (~160x160px)
- Importance indicators (critical/important/notable)
- Click to seek audio player to timestamp
- Fallback: hide section or show placeholder

### 4. TranscriptAccordion (Deep Dive)

**Data Sources:**
- `transcript_text` (parsed into segments)

**Features:**
- Search input with match highlighting
- Accordion items grouped by speaker
- Single-expand mode
- "Play from here" button in expanded view
- Timestamp display per segment

### 5. ActionFooter (Outro)

**Data Sources:**
- `summaries.deep.content.action_prompts`

**Features:**
- Three main action buttons:
  - Ask AI (placeholder/future feature)
  - Save to Library
  - Share Insight
- Action items checklist from deep summary
- Extra bottom padding for sticky player (pb-28)

### 6. QuickNav (Elevator)

**Features:**
- Fixed position: `right-4 top-1/2 -translate-y-1/2`
- Vertical pill with 4 icons
- IntersectionObserver for active section detection
- Smooth scroll on click
- Hidden on mobile (< sm breakpoint)

**Icon Mapping:**
| Icon | Section | data-section |
|------|---------|--------------|
| FileText | InsightHero | "hero" |
| Brain | MindmapTeaser | "mindmap" |
| Quote | HighlightsCarousel | "highlights" |
| ScrollText | TranscriptAccordion | "transcript" |

## Data Flow

```
page.tsx
  └── fetches episode + podcast
      └── <EpisodeSmartFeed episode={...} />
            └── fetches /api/episodes/[id]/insights
                ├── InsightHero ← summaries.quick OR episode.description
                ├── MindmapTeaser ← insights.content.mindmap
                ├── HighlightsCarousel ← insights.content.highlights
                ├── TranscriptAccordion ← transcript_text
                ├── ActionFooter ← summaries.deep.action_prompts
                └── QuickNav ← observes sections via refs
```

## Graceful Fallbacks

| Component | Missing Data | Fallback |
|-----------|--------------|----------|
| InsightHero | No quick summary | Show episode.description |
| MindmapTeaser | No mindmap | Show "Generate Insights" CTA |
| HighlightsCarousel | No highlights | Hide section entirely |
| TranscriptAccordion | No transcript | Show "Generate" CTA |
| ActionFooter | No action_prompts | Hide action items subsection |

## Dependencies

- `framer-motion` - animations (already installed)
- `lucide-react` - icons (already installed)
- Existing: `useAudioPlayer`, `StickyAudioPlayer`, UI components

## Files Modified

- `src/app/episode/[id]/insights/page.tsx` - simplified to use EpisodeSmartFeed

## Files Preserved

- Existing tab components kept for modal reuse
- `StickyAudioPlayer` unchanged
