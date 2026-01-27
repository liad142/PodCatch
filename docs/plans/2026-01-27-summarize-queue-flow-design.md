# Summarize Queue Flow Design

## Overview

Change the "Summarize" button flow so that processing happens on the episode list page with animated feedback, and navigation to the insights page only occurs when content is ready.

## User Flow

### Trigger Point
User is on any page showing episode cards (podcast detail, feed, search results). Each episode card has a "Summarize" button.

### Click Action
When user clicks "Summarize":
1. Button immediately transforms into the Sound Wave animation container
2. Episode is added to the processing queue (starts immediately if queue empty, or shows queue position)
3. No navigation occurs - user stays on current page

### Processing Stages Displayed on Card
1. **"Transcribing..."** - Colorful gradient sound waves animate, particles begin flowing off the waves representing audio being converted to text
2. **"Summarizing..."** - Text particles swirl inward with bouncy physics, condensing into a forming crystal/gem shape
3. **"Ready!"** - Gem completes with rainbow shimmer pulse, button text changes to "View Summary"

### Queue Behavior
- Multiple episodes can be queued
- Each shows position: "2nd in queue" with gentle pulsing dots
- Queue processes one at a time, never blocks on errors

### Navigation
Only when "Ready!" state is reached, user can click "View Summary" to go to `/episode/{id}/insights` with Summary tab active.

### Ready Criteria
- **Required:** Transcript + Quick Summary ready
- **Optional (background):** Deep Summary, Mindmap, Keywords, Highlights, Shownotes

---

## Animation Specifications

### Stage 1 - Transcribing (Sound Waves → Text Particles)

- **Duration:** Shown while transcript is being generated
- **Visuals:**
  - 3-4 sound wave bars with gradient colors (purple → blue → teal)
  - Waves pulse/bounce with varying heights (like an audio visualizer)
  - Small text-like particles (tiny "T" shapes or dots) float off the wave peaks
  - Particles drift rightward with subtle bounce physics
- **Text:** "Transcribing..." in muted color below animation

### Stage 2 - Summarizing (Particles → Gem)

- **Duration:** Shown while quick summary is being generated
- **Visuals:**
  - Sound waves fade out
  - Scattered text particles begin swirling in a circular motion
  - Particles spiral inward toward center with elastic/bouncy easing
  - Particles merge and crystallize into a gem shape
  - Gem outline forms with gradient fill (amber → pink → purple)
- **Text:** "Summarizing..." below animation

### Stage 3 - Ready (Gem Pulse)

- **Duration:** ~1.5 seconds celebration, then static
- **Visuals:**
  - Gem pulses outward with rainbow shimmer effect
  - Small sparkle particles burst from gem
  - Gem settles into gentle idle glow
  - Button morphs to show "View Summary" with the gem as icon
- **Text:** "Ready!" briefly, then button shows "View Summary"

### Animation Container Size
Fits within existing button area, approximately 120px × 40px

### Visual Style
- **Vibrant/Playful** - Colorful gradient waves, bouncy particle physics, gem has rainbow shimmer
- Fun and engaging aesthetic

---

## Queue System & State Management

### Queue States per Episode Card

| State | Visual | Button Text | Clickable |
|-------|--------|-------------|-----------|
| `idle` | Default button | "Summarize" | Yes - adds to queue |
| `queued` | Pulsing dots animation | "3rd in queue" | No |
| `transcribing` | Sound wave animation | "Transcribing..." | No |
| `summarizing` | Particle → gem animation | "Summarizing..." | No |
| `ready` | Glowing gem icon | "View Summary" | Yes - navigates |
| `failed` | Red error icon | "Retry" | Yes - re-queues |

### Queue Processing Logic

```
Global Queue: [episode1, episode2, episode3]
                   ↑
            Currently processing

- Max 1 processing at a time
- On completion/failure → shift queue, start next
- Failed episodes marked but don't block
```

### State Persistence
- Queue state stored in React context (client-side)
- Processing happens via existing API calls
- Polling continues even when navigating away
- On page return: state rehydrates from context + API status check

### Toast Trigger
- Fires when queue becomes empty AND at least one episode was processed
- Content: "X episodes ready" or "X ready, Y failed"
- Toast is global (shows on any page)

---

## Insights Page - Handling Incomplete Features

### On Navigation to Summary Tab
User clicks "View Summary" → lands on `/episode/{id}/insights` with Summary tab active.

### Summary Tab Content
- **Quick Summary:** Fully loaded and displayed (guaranteed ready)
- **Deep Summary:** If still processing, show mini sound wave animation with "Generating deep summary..." below the quick summary section

### Other Tabs State Indicators

Each tab header shows its status:
- **Ready:** Normal tab label, no indicator
- **Processing:** Tab label + small animated dot (same gradient colors)
- **Not Started:** Tab label slightly muted

### Tab Content When Processing

When user clicks a tab that's still generating:
```
┌─────────────────────────────────────┐
│                                     │
│      [Mini Sound Wave Animation]    │
│                                     │
│        Generating mindmap...        │
│                                     │
│   This usually takes a few moments  │
│                                     │
└─────────────────────────────────────┘
```

- Same vibrant/playful animation style but smaller scale
- Auto-refreshes when content becomes available (existing polling)
- No user action needed - just wait or switch tabs

### Failed State on Tabs
If a feature fails, show: "Generation failed" + "Retry" button within that tab

---

## Error Handling

### Silent Auto-Retry Flow

```
API Call Failed
      ↓
Wait 2 seconds (no visual change - still shows current stage animation)
      ↓
Retry API Call
      ↓
Success? → Continue to next stage
Failed?  → Show error state, skip to next in queue
```

### Error State on Episode Card

```
┌────────────────────────────────────────┐
│  [!] Failed                    [Retry] │
└────────────────────────────────────────┘
```

- Red/orange warning icon
- "Failed" text (no technical details on card)
- "Retry" button - clicking re-adds to end of queue
- Card stays in this state until user retries or navigates away

### Error Types Handled
- Network timeout → retry then fail
- API error (500, etc.) → retry then fail
- Audio too long/invalid → fail immediately (no retry)
- Rate limiting → retry with backoff then fail

### Queue Continuation
- Failed episode is marked and skipped
- Next episode in queue starts immediately
- Queue never pauses or blocks

### Summary Toast with Failures
- "4 episodes ready, 2 failed"
- Toast could include "View failed" link (optional - or user just sees red states on cards)

### Retry Behavior
- Clicking "Retry" adds episode to END of current queue
- If queue empty, starts processing immediately
- Full process restarts (transcript + summary)

---

## Technical Implementation

### New Components to Create

| Component | Purpose |
|-----------|---------|
| `SummarizeQueueProvider` | React context managing global queue state |
| `SoundWaveAnimation` | Animated sound wave bars (Stage 1) |
| `ParticleGemAnimation` | Particle-to-gem morph (Stage 2) |
| `GemCompleteAnimation` | Rainbow shimmer celebration (Stage 3) |
| `SummarizeButton` | Smart button that shows appropriate state/animation |
| `QueuePositionIndicator` | "2nd in queue" with pulsing dots |
| `MiniLoadingAnimation` | Smaller version for tabs on insights page |

### Files to Modify

| File | Changes |
|------|---------|
| `EpisodeCard.tsx` | Replace current button with `SummarizeButton` |
| `InsightHub.tsx` | Add processing indicators to tab headers |
| `Tab content components` | Add `MiniLoadingAnimation` for processing state |
| `layout.tsx` or `providers.tsx` | Wrap app with `SummarizeQueueProvider` |

### Animation Tech
- Framer Motion for animations (if already in project) or CSS keyframes + React state
- Canvas or SVG for particle effects (lightweight approach)

### State Flow
```
User Click → Queue Context adds episode →
Polling starts → Status updates →
Animation reflects status →
Ready triggers button transform + toast check
```

---

## Summary

This design transforms the summarization UX from immediate navigation to a polished, animated queue-based system where:
1. Users trigger processing from the episode list
2. A vibrant Sound Wave → Gem animation shows progress
3. Multiple episodes can be queued with position indicators
4. Errors auto-retry then skip without blocking the queue
5. Navigation only happens when Quick Summary is ready
6. Other features continue processing in background with visual indicators
