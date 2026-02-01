# Sticky Audio Player - Implementation Guide

A Spotify-style persistent audio player that docks at the bottom of the viewport and plays podcast episodes across the entire app.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        layout.tsx                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  AudioPlayerProvider                       │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                    App Content                       │  │  │
│  │  │                                                      │  │  │
│  │  │   ┌──────────────┐    ┌──────────────┐              │  │  │
│  │  │   │ PlayButton   │    │ PlayButton   │   ...        │  │  │
│  │  │   │ (Episode 1)  │    │ (Episode 2)  │              │  │  │
│  │  │   └──────────────┘    └──────────────┘              │  │  │
│  │  │                                                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              StickyAudioPlayer                       │  │  │
│  │  │  (Fixed at bottom, shows when track is loaded)       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── contexts/
│   └── AudioPlayerContext.tsx    # Global audio state management
├── components/
│   ├── StickyAudioPlayer.tsx     # The dock player UI
│   ├── PlayButton.tsx            # Reusable play buttons
│   └── ui/
│       └── slider.tsx            # Custom slider for progress/volume
└── app/
    └── layout.tsx                # Provider + player integration
```

## Core Components

### 1. AudioPlayerContext (`src/contexts/AudioPlayerContext.tsx`)

The central state manager for all audio playback. Uses the native `HTMLAudioElement` under the hood.

#### Track Interface

```typescript
interface Track {
  id: string;           // Unique episode ID
  title: string;        // Episode title
  artist: string;       // Podcast name
  artworkUrl: string;   // Album art URL
  audioUrl: string;     // Audio file URL
  duration?: number;    // Duration in seconds (optional)
}
```

#### State Interface

```typescript
interface AudioPlayerState {
  currentTrack: Track | null;  // Currently loaded track
  isPlaying: boolean;          // Playback state
  currentTime: number;         // Current position (seconds)
  duration: number;            // Total duration (seconds)
  volume: number;              // Volume level (0-1)
  playbackRate: number;        // Speed (0.5, 1, 1.5, 2, etc.)
  isLoading: boolean;          // Loading/buffering state
  isExpanded: boolean;         // Expanded UI state
}
```

#### Available Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `play` | `(track?: Track) => void` | Play a track or resume current |
| `pause` | `() => void` | Pause playback |
| `toggle` | `() => void` | Toggle play/pause |
| `seek` | `(time: number) => void` | Seek to absolute time |
| `seekRelative` | `(delta: number) => void` | Seek relative (e.g., -15s, +15s) |
| `setVolume` | `(volume: number) => void` | Set volume (0-1) |
| `setPlaybackRate` | `(rate: number) => void` | Set speed (0.5-2) |
| `loadTrack` | `(track: Track) => void` | Load without playing |
| `clearTrack` | `() => void` | Stop and clear |
| `toggleExpanded` | `() => void` | Toggle expanded UI |

#### Usage

```tsx
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

function MyComponent() {
  const { 
    currentTrack, 
    isPlaying, 
    play, 
    pause,
    currentTime,
    duration 
  } = useAudioPlayer();

  const handlePlay = () => {
    play({
      id: 'episode-123',
      title: 'Episode Title',
      artist: 'Podcast Name',
      artworkUrl: 'https://...',
      audioUrl: 'https://...',
    });
  };

  return (
    <button onClick={handlePlay}>
      {isPlaying ? 'Pause' : 'Play'}
    </button>
  );
}
```

#### Safe Hook (No Throw)

```tsx
import { useAudioPlayerSafe } from '@/contexts/AudioPlayerContext';

// Returns null if used outside provider (doesn't throw)
const player = useAudioPlayerSafe();
if (player) {
  // Use player
}
```

---

### 2. StickyAudioPlayer (`src/components/StickyAudioPlayer.tsx`)

The visual dock player. Automatically shows when a track is loaded.

#### Design Specs

| Property | Value |
|----------|-------|
| Position | `fixed bottom-0` |
| Background | `bg-black/90 backdrop-blur-xl` |
| Border | `border-t border-white/10` |
| Desktop offset | `lg:left-64` (accounts for sidebar) |
| Height | ~80px (compact), expandable |

#### Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ Progress Bar (top edge)        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────┐  Title          ⏮  ▶  ⏭     🔊 ━━━━━  ⌃  ✕         │
│  │ 🎵 │  Artist         15  ||  15    1x                     │
│  └────┘                  0:00 / 52:19                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
   Left      Center (Controls)           Right (Volume/Extras)
```

#### Expanded View

When user clicks the expand button (⌃), additional controls appear:
- Full-width progress slider
- All playback speed options (0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x)
- Mobile volume slider

---

### 3. PlayButton (`src/components/PlayButton.tsx`)

Reusable button to trigger playback from anywhere in the app.

#### Props

```typescript
interface PlayButtonProps {
  track: Track;                           // Required track data
  size?: 'sm' | 'md' | 'lg';             // Button size
  variant?: 'primary' | 'outline' | 'ghost' | 'overlay';
  className?: string;                     // Additional classes
  showLabel?: boolean;                    // Show "Play" text
}
```

#### Variants

| Variant | Use Case | Style |
|---------|----------|-------|
| `primary` | Main CTA | Solid purple, shadow |
| `outline` | Secondary action | Border, transparent bg |
| `ghost` | Minimal | No bg, hover state |
| `overlay` | Over images | Dark blur bg |

#### Example Usage

```tsx
import { PlayButton, InlinePlayButton } from '@/components/PlayButton';

// Icon-only button (for cards)
<PlayButton
  track={{
    id: episode.id,
    title: episode.title,
    artist: podcast.name,
    artworkUrl: podcast.artworkUrl,
    audioUrl: episode.audioUrl,
  }}
  size="md"
  variant="overlay"
/>

// Button with label (for action rows)
<InlinePlayButton
  track={{
    id: episode.id,
    title: episode.title,
    artist: podcast.name,
    artworkUrl: podcast.artworkUrl,
    audioUrl: episode.audioUrl,
  }}
/>
```

#### Smart State

The PlayButton automatically:
- Shows Play icon when not playing this track
- Shows Pause icon when this track is playing
- Shows Loader when this track is buffering
- Handles toggle logic internally

---

### 4. Slider (`src/components/ui/slider.tsx`)

Custom slider component used for progress and volume.

#### Props

```typescript
interface SliderProps {
  value: number[];                    // Current value [0-100]
  onValueChange: (value: number[]) => void;
  max?: number;                       // Default: 100
  min?: number;                       // Default: 0
  step?: number;                      // Default: 1
  className?: string;
  trackClassName?: string;            // Track (background) styles
  rangeClassName?: string;            // Filled range styles
  thumbClassName?: string;            // Thumb (handle) styles
  disabled?: boolean;
}
```

#### Usage in Player

```tsx
// Progress bar (0-100%)
<Slider
  value={[progressPercentage]}
  onValueChange={(v) => seek((v[0] / 100) * duration)}
  max={100}
  trackClassName="h-1 bg-white/10"
  rangeClassName="bg-gradient-to-r from-primary to-violet-400"
/>

// Volume slider (0-100)
<Slider
  value={[volume * 100]}
  onValueChange={(v) => setVolume(v[0] / 100)}
  max={100}
/>
```

---

## Integration Guide

### Adding Play to a New Component

1. **Import the PlayButton or hook:**

```tsx
import { PlayButton } from '@/components/PlayButton';
// or
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
```

2. **Build the track object:**

```tsx
const track = {
  id: episode.id,
  title: episode.title,
  artist: podcast.name,
  artworkUrl: episode.artworkUrl || podcast.artworkUrl,
  audioUrl: episode.audioUrl,
  duration: episode.duration,
};
```

3. **Render the button:**

```tsx
{episode.audioUrl && (
  <PlayButton track={track} size="md" variant="primary" />
)}
```

### Checking if Current Track

```tsx
const { currentTrack, isPlaying } = useAudioPlayer();

const isThisPlaying = currentTrack?.audioUrl === myAudioUrl && isPlaying;
```

---

## Styling Customization

### CSS Variables Used

The player respects the app's theme via CSS variables:

```css
--primary: 262 83% 58%;        /* Purple accent */
--primary-foreground: ...;      /* Text on primary */
--background: ...;              /* App background */
```

### Key Tailwind Classes

| Element | Classes |
|---------|---------|
| Container | `bg-black/90 backdrop-blur-xl border-t border-white/10` |
| Play button | `bg-white text-black rounded-full shadow-lg` |
| Progress glow | `bg-primary/50 blur-sm` |
| Skip buttons | `text-white/70 hover:text-white hover:bg-white/10` |

---

## Accessibility

- All buttons have `aria-label` attributes
- Slider has `role="slider"` with `aria-valuemin/max/now`
- Keyboard navigable (tab, space/enter)
- Focus-visible rings on interactive elements

---

## Dependencies

```json
{
  "react-use": "^17.x",      // Audio utilities (installed but context uses native Audio)
  "framer-motion": "^12.x",  // Animations
  "lucide-react": "^0.5x"    // Icons
}
```

---

## Troubleshooting

### Player not showing?
- Check that `AudioPlayerProvider` wraps your app in `layout.tsx`
- Verify `currentTrack` is not null (player hides when no track)
- Check browser console for audio loading errors

### Audio not playing?
- Verify `audioUrl` is a valid, accessible URL
- Check CORS headers on audio host
- Some browsers require user interaction before audio plays

### Styling issues?
- Ensure `pb-24` padding on main content (prevents overlap)
- Check z-index conflicts (player uses `z-50`)
- Desktop sidebar offset: `lg:left-64`
