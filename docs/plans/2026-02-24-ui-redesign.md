# PodCatch UI Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **Execution Model:** superpowers:dispatching-parallel-agents — 4 build agents + 1 devil-advocate reviewer.

**Goal:** Transform PodCatch into a premium, Spotify/Apple-caliber podcast application with a fresh visual identity, refined dark + light themes, and polished UX across Discovery and Episode Insights pages.

**Architecture:** Pure CSS token swap at the foundation layer, then component-by-component redesign working outward. No data layer or API changes — this is strictly a presentation-layer redesign. Each agent owns a vertical slice (design system, discovery page, insights page, navigation/player) and the devil agent reviews every merge for quality regression.

**Tech Stack:** Next.js 16 + Tailwind CSS 4 + Framer Motion + Lucide icons + Plus Jakarta Sans + Inter fonts

---

## Design System Definition

### Color Palette

The current app uses a blue-tinted dark background (`#0f111a`) with a muddy purple primary. The new palette shifts to **neutral zinc-based darks** (like Spotify) with a **refined violet primary** and **warm amber accent** (like Apple's highlight warmth).

#### Dark Theme (Default)

| Token                | Value                      | Usage                           |
|----------------------|----------------------------|---------------------------------|
| `--background`       | `#09090B` (zinc-950)       | Page background                 |
| `--surface-1`        | `#18181B` (zinc-900)       | Cards, panels                   |
| `--surface-2`        | `#27272A` (zinc-800)       | Elevated cards, hover states    |
| `--surface-3`        | `#3F3F46` (zinc-700)       | Active states, pressed          |
| `--border`           | `rgba(255,255,255,0.08)`   | Subtle dividers                 |
| `--border-strong`    | `rgba(255,255,255,0.14)`   | Card borders, input borders     |
| `--text-primary`     | `#FAFAFA` (zinc-50)        | Headings, primary text          |
| `--text-secondary`   | `#A1A1AA` (zinc-400)       | Body text, descriptions         |
| `--text-tertiary`    | `#71717A` (zinc-500)       | Timestamps, metadata            |
| `--primary`          | `#8B5CF6` (violet-500)     | Buttons, links, active states   |
| `--primary-hover`    | `#7C3AED` (violet-600)     | Button hover                    |
| `--primary-subtle`   | `rgba(139,92,246,0.12)`    | Badge backgrounds, tinted areas |
| `--accent-green`     | `#22C55E` (green-500)      | Play buttons, success           |
| `--accent-green-hover`| `#16A34A` (green-600)     | Play button hover               |
| `--accent-amber`     | `#F59E0B` (amber-500)      | Highlights, golden nuggets      |
| `--accent-amber-subtle`| `rgba(245,158,11,0.12)`  | Highlight backgrounds           |
| `--destructive`      | `#EF4444` (red-500)        | Errors, contrarian views        |
| `--destructive-subtle`| `rgba(239,68,68,0.12)`    | Error backgrounds               |

#### Light Theme

| Token                | Value                      | Usage                           |
|----------------------|----------------------------|---------------------------------|
| `--background`       | `#FAFAFA` (zinc-50)        | Page background                 |
| `--surface-1`        | `#FFFFFF`                  | Cards, panels                   |
| `--surface-2`        | `#F4F4F5` (zinc-100)       | Elevated cards, hover states    |
| `--surface-3`        | `#E4E4E7` (zinc-200)       | Active states, pressed          |
| `--border`           | `#E4E4E7` (zinc-200)       | Subtle dividers                 |
| `--border-strong`    | `#D4D4D8` (zinc-300)       | Card borders, input borders     |
| `--text-primary`     | `#09090B` (zinc-950)       | Headings, primary text          |
| `--text-secondary`   | `#52525B` (zinc-600)       | Body text, descriptions         |
| `--text-tertiary`    | `#A1A1AA` (zinc-400)       | Timestamps, metadata            |
| `--primary`          | `#7C3AED` (violet-600)     | Buttons, links, active states   |
| `--primary-hover`    | `#6D28D9` (violet-700)     | Button hover                    |
| `--primary-subtle`   | `rgba(124,58,237,0.08)`    | Badge backgrounds, tinted areas |
| `--accent-green`     | `#16A34A` (green-600)      | Play buttons, success           |
| `--accent-amber`     | `#D97706` (amber-600)      | Highlights, golden nuggets      |
| `--destructive`      | `#DC2626` (red-600)        | Errors                          |

### Typography

| Role       | Font              | Weight | Size (Desktop)  | Size (Mobile)  |
|------------|-------------------|--------|-----------------|----------------|
| Display    | Plus Jakarta Sans | 700    | 36px / 2.25rem  | 28px / 1.75rem |
| H1         | Plus Jakarta Sans | 700    | 30px / 1.875rem | 24px / 1.5rem  |
| H2         | Plus Jakarta Sans | 600    | 24px / 1.5rem   | 20px / 1.25rem |
| H3         | Plus Jakarta Sans | 600    | 20px / 1.25rem  | 18px / 1.125rem|
| H4         | Plus Jakarta Sans | 600    | 16px / 1rem     | 16px / 1rem    |
| Body       | Inter             | 400    | 15px / 0.9375rem| 15px           |
| Body Small | Inter             | 400    | 13px / 0.8125rem| 13px           |
| Caption    | Inter             | 500    | 11px / 0.6875rem| 11px           |
| Mono       | JetBrains Mono    | 400    | 13px            | 13px           |

**Line heights:** Headings 1.2, Body 1.6, Captions 1.4
**Max prose width:** 680px (for readability on summary/overview text)

### Spacing Scale

Use Tailwind's default spacing scale. Key architectural spacings:
- Section gap: `48px` (gap-12)
- Card padding: `20px` (p-5) desktop, `16px` (p-4) mobile
- Card gap in grids: `16px` (gap-4)
- Inner element gap: `12px` (gap-3)

### Border Radius

| Element      | Radius           |
|--------------|------------------|
| Cards        | `16px` (rounded-2xl) |
| Buttons      | `12px` (rounded-xl)  |
| Badges/Pills | `9999px` (rounded-full) |
| Inputs       | `12px` (rounded-xl)  |
| Avatars      | `9999px` (rounded-full) |
| Images       | `12px` (rounded-xl)  |

### Elevation / Shadows (replacing glass morphism)

Shift from heavy backdrop-blur glass effects to subtle shadow-based elevation (Apple-style):

| Level     | Dark Theme                             | Light Theme                              |
|-----------|----------------------------------------|------------------------------------------|
| Level 0   | No shadow (flat on background)         | No shadow                                |
| Level 1   | `0 1px 2px rgba(0,0,0,0.3)`           | `0 1px 3px rgba(0,0,0,0.06)`            |
| Level 2   | `0 4px 12px rgba(0,0,0,0.4)`          | `0 4px 12px rgba(0,0,0,0.08)`           |
| Level 3   | `0 8px 24px rgba(0,0,0,0.5)`          | `0 8px 24px rgba(0,0,0,0.12)`           |
| Floating  | `0 16px 48px rgba(0,0,0,0.6)`         | `0 16px 48px rgba(0,0,0,0.16)`          |

**Glass effect:** Keep glass ONLY for the audio player bar and modals (where content scrolls behind). Remove from all other components. Replace with solid `--surface-1` backgrounds with Level 1–2 shadows.

### Button System

Three semantic button types used everywhere:

| Type          | Dark                                         | Light                                        |
|---------------|----------------------------------------------|----------------------------------------------|
| **Primary**   | bg-violet-500, text-white, hover:bg-violet-600 | bg-violet-600, text-white, hover:bg-violet-700 |
| **Secondary** | bg-zinc-800, text-zinc-200, hover:bg-zinc-700   | bg-zinc-100, text-zinc-800, hover:bg-zinc-200   |
| **Ghost**     | bg-transparent, text-zinc-400, hover:bg-zinc-800 | bg-transparent, text-zinc-600, hover:bg-zinc-100 |

**Play Button (special):** Always green — `bg-green-500 text-white hover:bg-green-600`, circular with Lucide Play icon.

**Sizes:** `sm` (h-8 px-3 text-sm), `md` (h-10 px-4 text-sm), `lg` (h-12 px-6 text-base)

All buttons: `cursor-pointer`, `transition-colors duration-150`, `rounded-xl`, `font-medium`

### Icon System

- **Library:** Lucide React (already installed, v0.563)
- **Sizes:** 16px (inline), 20px (buttons/nav), 24px (section headers)
- **Stroke:** 1.5px (default Lucide)
- **Rule:** NO emojis as functional icons. The lightbulb on Core Concepts, the clock on chapters — all must be Lucide SVG icons.

---

## Agent Workstream Breakdown

### Agent 1: Design System Foundation
**Scope:** CSS tokens, base components, fonts, theme infrastructure
**No dependencies on other agents**

### Agent 2: Discovery Page
**Scope:** All `/discover` route components
**Depends on:** Agent 1 (tokens and base components)

### Agent 3: Episode Insights Page
**Scope:** All `/episode/[id]/insights` route components
**Depends on:** Agent 1 (tokens and base components)

### Agent 4: Navigation, Layout & Audio Player
**Scope:** AppShell, Sidebar, Header, StickyAudioPlayer
**Depends on:** Agent 1 (tokens and base components)

### Devil Agent: Quality Reviewer
**Scope:** Reviews ALL agent output after each task
**Runs after:** Each agent completes a task
**Checks:** Contrast ratios (4.5:1), spacing consistency, token usage, responsive breakpoints, no emojis as icons, cursor-pointer on interactives, transition smoothness, line-length on prose

---

## Agent 1: Design System Foundation

### Task 1.1: Install Plus Jakarta Sans Font

**Files:**
- Modify: `src/app/layout.tsx`

**Steps:**
1. Add Plus Jakarta Sans import alongside existing Inter:
```tsx
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700'],
})
```
2. Apply both font variables to the `<html>` or `<body>` className
3. Remove Crimson Text and Outfit font imports (unused in new design)
4. Verify fonts load correctly in browser

**Commit:** `style: add Plus Jakarta Sans font, remove unused fonts`

---

### Task 1.2: Replace Color Tokens in globals.css

**Files:**
- Modify: `src/app/globals.css`

**Steps:**
1. Replace ALL existing `@theme` HSL color variables with the new token palette defined above
2. Map old variables to new:
   - `--background` → new zinc-950 / zinc-50
   - `--foreground` → new text-primary
   - `--card` → new surface-1
   - `--primary` → new violet-500 / violet-600
   - `--muted-foreground` → new text-secondary
   - `--border` → new border tokens
3. Add NEW tokens that don't exist yet:
   - `--surface-1`, `--surface-2`, `--surface-3`
   - `--text-primary`, `--text-secondary`, `--text-tertiary`
   - `--accent-green`, `--accent-amber`, `--destructive-subtle`, `--primary-subtle`
4. Add elevation/shadow CSS custom properties:
   - `--shadow-1`, `--shadow-2`, `--shadow-3`, `--shadow-floating`
5. Set default `font-family` to Inter for body, Plus Jakarta Sans for headings via `@layer base`
6. Define prose max-width utility: `.prose-width { max-width: 680px; }`
7. Remove all `.glass-*` custom properties (except player-specific ones)

**Commit:** `style: replace color tokens with new design system palette`

---

### Task 1.3: Rewrite glass.ts → elevation.ts

**Files:**
- Rename/Rewrite: `src/lib/glass.ts` → `src/lib/elevation.ts`

**Steps:**
1. Replace ALL glass morphism presets with shadow-based elevation:
```ts
export const elevation = {
  card: 'bg-[var(--surface-1)] border border-[var(--border)] shadow-[var(--shadow-1)] rounded-2xl',
  cardHover: 'hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-2)] transition-all duration-150',
  cardInteractive: 'bg-[var(--surface-1)] border border-[var(--border)] shadow-[var(--shadow-1)] rounded-2xl cursor-pointer hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-2)] transition-all duration-150',
  surface: 'bg-[var(--surface-1)]',
  surfaceRaised: 'bg-[var(--surface-2)]',
  input: 'bg-[var(--surface-2)] border border-[var(--border-strong)] rounded-xl',
  buttonPrimary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-xl font-medium transition-colors duration-150',
  buttonSecondary: 'bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)] rounded-xl font-medium transition-colors duration-150',
  buttonGhost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-2)] rounded-xl transition-colors duration-150',
  floating: 'bg-[var(--surface-1)] border border-[var(--border)] shadow-[var(--shadow-floating)] rounded-2xl',
  // KEEP glass only for player and modals
  playerBar: 'backdrop-blur-xl bg-[var(--background)]/80 border-t border-[var(--border)]',
  modal: 'backdrop-blur-xl bg-[var(--background)]/90',
  overlay: 'bg-black/60 backdrop-blur-sm',
} as const
```
2. Update ALL imports across the codebase from `glass` → `elevation`:
   - `grep -r "from.*glass" src/` to find all usages
   - Replace import paths and property references
   - This touches ~20+ component files — every file that currently imports from `glass.ts`

**Commit:** `refactor: replace glass morphism with elevation-based design system`

---

### Task 1.4: Update Base UI Components

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/skeleton.tsx`
- Modify: `src/components/ui/dialog.tsx`

**Steps:**
1. **button.tsx**: Rewrite CVA variants to match new button system:
   - Remove `glass`, `glass-outline`, `glass-primary` variants
   - Update `default` variant to use `--primary` / `--primary-hover`
   - Update `secondary` to use `--surface-2`
   - Update `ghost` to use transparent + hover surface-2
   - Add `play` variant: green circular play button
   - Ensure ALL variants have `cursor-pointer` and `transition-colors duration-150`
   - Update border-radius to `rounded-xl`

2. **card.tsx**: Rewrite variants:
   - Remove `glass`, `glass-subtle` variants
   - Default card: `bg-[var(--surface-1)] border border-[var(--border)] shadow-[var(--shadow-1)] rounded-2xl`
   - Interactive card: add `cursor-pointer hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-2)] transition-all duration-150`

3. **badge.tsx**: Clean up variants:
   - Default: `bg-[var(--primary-subtle)] text-[var(--primary)]`
   - Secondary: `bg-[var(--surface-2)] text-[var(--text-secondary)]`
   - Destructive: `bg-[var(--destructive-subtle)] text-[var(--destructive)]`
   - `rounded-full` on all badges, `text-xs font-medium px-2.5 py-0.5`

4. **input.tsx**: Use `elevation.input` styling, update focus ring to `--primary`

5. **skeleton.tsx**: Use `bg-[var(--surface-2)] animate-pulse rounded-xl`

6. **dialog.tsx**: Use `elevation.modal` and `elevation.overlay`

**Commit:** `style: update all base UI components to new design system`

---

### Task 1.5: Create Typography Utility Classes

**Files:**
- Modify: `src/app/globals.css`

**Steps:**
Add heading utility classes in `@layer utilities`:
```css
@layer utilities {
  .text-display { font-family: var(--font-plus-jakarta); font-weight: 700; font-size: 2.25rem; line-height: 1.2; letter-spacing: -0.025em; }
  .text-h1 { font-family: var(--font-plus-jakarta); font-weight: 700; font-size: 1.875rem; line-height: 1.2; letter-spacing: -0.025em; }
  .text-h2 { font-family: var(--font-plus-jakarta); font-weight: 600; font-size: 1.5rem; line-height: 1.2; letter-spacing: -0.02em; }
  .text-h3 { font-family: var(--font-plus-jakarta); font-weight: 600; font-size: 1.25rem; line-height: 1.3; }
  .text-h4 { font-family: var(--font-plus-jakarta); font-weight: 600; font-size: 1rem; line-height: 1.3; }
  .text-body { font-family: var(--font-inter); font-size: 0.9375rem; line-height: 1.6; }
  .text-body-sm { font-family: var(--font-inter); font-size: 0.8125rem; line-height: 1.5; }
  .text-caption { font-family: var(--font-inter); font-weight: 500; font-size: 0.6875rem; line-height: 1.4; text-transform: uppercase; letter-spacing: 0.05em; }
}
```

**Commit:** `style: add typography utility classes for heading hierarchy`

---

## Agent 2: Discovery Page Redesign

> **Depends on:** Agent 1 tasks 1.1–1.5 must be complete before starting.

### Task 2.1: Redesign SemanticSearchBar

**Files:**
- Modify: `src/components/discovery/SemanticSearchBar.tsx`

**Current problems:** Thin, low-contrast, easy to miss.

**New design:**
- Prominent search bar with `elevation.input` styling
- Larger: `h-12` with `text-base` placeholder
- Left-aligned Search icon (Lucide `Search`, 20px, text-tertiary)
- Placeholder: "Search podcasts, topics, or creators..."
- Results dropdown: `elevation.floating` with shadow-floating
- Each result row: podcast artwork (40x40 rounded-xl), title (text-primary, font-medium), author (text-secondary, text-sm)
- Keyboard selection: highlighted row uses `bg-[var(--surface-2)]`
- Full width with `max-w-2xl mx-auto` centering

**Commit:** `style: redesign semantic search bar with prominence`

---

### Task 2.2: Redesign DailyMixCarousel + DailyMixCard

**Files:**
- Modify: `src/components/discovery/DailyMixCarousel.tsx`
- Modify: `src/components/discovery/DailyMixCard.tsx`

**Current problems:** Cards look like blog posts, no audio indicator, no clear CTA.

**New DailyMixCard design:**
- Card size: `w-[340px] h-[200px]` with `rounded-2xl overflow-hidden` and `elevation.cardInteractive`
- Background: Podcast artwork as blurred bg (`blur-2xl scale-110 opacity-30`) with solid `--surface-1` overlay at 80%
- Layout (inside card, padded p-5):
  - Top row: Podcast avatar (48x48, rounded-full, border-2 border-white/20), podcast name (text-body-sm, text-secondary), date (text-caption, text-tertiary)
  - Middle: Episode title (text-h4, text-primary, line-clamp-2)
  - Bottom row: Green play button (32x32, rounded-full, bg-accent-green) on left, duration badge on right
- Hover: card lifts with shadow-2, play button scales slightly
- Carousel navigation: Lucide ChevronLeft/ChevronRight in `elevation.buttonSecondary` circular buttons
- Section heading: `text-h2` "Daily Mix" with `text-body-sm text-secondary` subtitle "Fresh summaries picked for you"

**Commit:** `style: redesign Daily Mix carousel with premium cards`

---

### Task 2.3: Redesign BrandShelf + BrandBubble

**Files:**
- Modify: `src/components/discovery/BrandShelf.tsx`
- Modify: `src/components/discovery/BrandBubble.tsx`

**Current problems:** Circular avatars too small, text wraps, no visual distinction between sections.

**New BrandBubble design:**
- Size: `80x80` avatar (up from ~56px), rounded-full, `border-2 border-[var(--border)]`
- Below avatar: podcast name (text-body-sm, text-primary, font-medium, line-clamp-1, text-center, max-w-[88px])
- Hover: `ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]` with `transition-all duration-200`
- Remove scale transform on hover (causes layout shift per skill rules)

**New BrandShelf design:**
- Section heading: `text-h3` with Lucide icon (e.g. `TrendingUp` for Top Podcasts, `Heart` for "Because you like...")
- "See All" link on the right: `text-body-sm text-primary font-medium hover:underline cursor-pointer`
- Horizontal scroll with `overflow-x-auto scrollbar-hide` and `gap-4`
- Scroll indicators: fade-out gradient on edges when content overflows
- Visual differentiation between sections: "Because you like X" gets a subtle colored left-border accent or a `--primary-subtle` background pill behind the section label

**Commit:** `style: redesign brand shelf with larger bubbles and section clarity`

---

### Task 2.4: Redesign CuriosityFeed + InsightCard

**Files:**
- Modify: `src/components/discovery/CuriosityFeed.tsx`
- Modify: `src/components/discovery/InsightCard.tsx`

**Current problems:** Good foundation but buttons are tiny, heart icon invisible, Summarize/View Summary inconsistent.

**New InsightCard design:**
- Card: `elevation.card` with `p-5`
- Layout:
  - Top row: Podcast avatar (40x40, rounded-full), podcast name (text-body-sm, font-medium, text-primary), dot separator, date (text-body-sm, text-tertiary)
  - Right of top row: Heart button (Lucide `Heart`, 20px, text-tertiary, filled + text-red-500 when subscribed), `cursor-pointer`
  - Title: `text-h4 text-primary` (line-clamp-2)
  - Description: `text-body-sm text-secondary` (line-clamp-3)
  - Bottom row (gap-3):
    - Play button: `h-9 px-4 rounded-full bg-accent-green text-white text-sm font-medium` with Lucide `Play` icon (16px)
    - Summarize button: Two states:
      - Not generated: `h-9 px-4 rounded-full` secondary button style, Lucide `Sparkles` icon + "Summarize"
      - Already generated: `h-9 px-4 rounded-full` primary-subtle bg, Lucide `BookOpen` icon + "View Summary" in `text-primary`
      - Processing: secondary style with spinner + "Summarizing..." or queue position

**New CuriosityFeed:**
- Section heading: `text-h2` "Curiosity Feed" with `text-body-sm text-secondary` subtitle
- Cards in a single column, `gap-4`
- Infinite scroll with skeleton loader (3 skeleton cards)

**Commit:** `style: redesign curiosity feed and insight cards`

---

### Task 2.5: Redesign UnifiedFeed (Your Feed)

**Files:**
- Modify: `src/components/discovery/UnifiedFeed.tsx`

**Current problems:** YouTube cards have spammy auto-generated thumbnails, clashing colors.

**New design:**
- Filter tabs: Pill-style tabs (`rounded-full`) — active tab: `bg-[var(--primary)] text-white`, inactive: `bg-[var(--surface-2)] text-secondary hover:text-primary`
- Card grid: 2 columns on desktop, 1 on mobile
- YouTube video cards:
  - Thumbnail: actual YouTube thumbnail image (16:9 aspect ratio, `rounded-xl`)
  - Below thumbnail: channel avatar (32x32) + channel name (text-body-sm, text-secondary) + date
  - Title: `text-h4 text-primary line-clamp-2`
  - Bottom: bookmark icon button (Lucide `Bookmark` / `BookmarkCheck`)
  - **Note:** No "Summarize" or "Watch" for YouTube yet — just display. Future task will add YouTube summarization.
- Podcast episode cards: Same design as InsightCard for consistency
- If no YouTube subscriptions: Show tasteful empty state with `elevation.card`

**Commit:** `style: redesign unified feed with clean video cards`

---

### Task 2.6: Redesign Discover Page Layout

**Files:**
- Modify: `src/app/discover/page.tsx`

**Current problems:** Sections blur together, no visual hierarchy, inconsistent spacing.

**New layout (top to bottom):**
```
[Search Bar] — centered, max-w-2xl, mb-12

[Daily Mix] — full width carousel, mb-12
  Section heading + subtitle + nav arrows

[Your Feed] — if authenticated, with filter tabs, mb-12
  Section heading + tab pills + 2-col grid

[Because you like {Genre}] — one BrandShelf per genre, mb-8 each
  Section heading with genre pill + "See All" link

[Top Podcasts] — BrandShelf, mb-12
  Section heading with TrendingUp icon

[Curiosity Feed] — full width card list
  Section heading + subtitle + infinite scroll
```

- **Section spacing:** `mb-12` (48px) between major sections
- **Section headings:** Consistent pattern — `text-h2` title on left, optional action on right
- **Container:** `max-w-6xl mx-auto px-4 lg:px-8`
- **Skeleton states:** Each section independently shows skeletons while loading (preserve current progressive loading)

**Commit:** `style: redesign discover page layout with clear visual hierarchy`

---

## Agent 3: Episode Insights Page Redesign

> **Depends on:** Agent 1 tasks 1.1–1.5 must be complete before starting.

### Task 3.1: Add Episode Hero Header

**Files:**
- Modify: `src/app/episode/[id]/insights/page.tsx`
- Modify: `src/components/insights/EpisodeSmartFeed.tsx`

**Current problem:** No episode context — you land on the page with no idea what you're reading.

**New Episode Hero (top of insights page):**
- Full-width section with subtle blurred podcast artwork background (opacity 5-8%, blur-3xl)
- Content (max-w-4xl mx-auto):
  - Breadcrumb: `text-caption text-tertiary` — "Discover / The Bulwark Podcast / Episode"
  - Row: Podcast artwork (80x80, rounded-xl, shadow-2) on left
  - Right of artwork:
    - Podcast name: `text-body-sm text-secondary font-medium` with link to podcast page
    - Episode title: `text-h1 text-primary`
    - Metadata row: date (text-body-sm, text-tertiary, Lucide Calendar 14px) + duration (Lucide Clock 14px) + language badge
  - Below: Green play button (h-10 px-5) + "Share" ghost button (Lucide Share2)
- Separator: `border-b border-[var(--border)]` with `mb-8`

**Commit:** `feat: add episode hero header to insights page`

---

### Task 3.2: Redesign Teaser Card (Quick Summary)

**Files:**
- Modify: `src/components/insights/EpisodeSmartFeed.tsx` (the teaser section)

**Current:** Part of the smart feed but not visually distinct.

**New design:**
- Full-width card: `elevation.card` with `p-6 lg:p-8`
- Hook headline: `text-display text-primary mb-4` (the biggest text on the page)
- Executive brief: `text-body text-secondary mb-6 prose-width`
- Golden nugget: Special blockquote card:
  - `bg-[var(--accent-amber-subtle)] border-l-4 border-amber-500 rounded-r-xl p-4`
  - Lucide `Quote` icon (20px, text-amber-500) top-left
  - Text: `text-body text-primary italic`
- Bottom row: "Perfect for" text + tag pills (`badge` component, secondary variant)

**Commit:** `style: redesign teaser card with premium typography`

---

### Task 3.3: Redesign Comprehensive Overview

**Files:**
- Modify: `src/components/insights/EpisodeSmartFeed.tsx` (overview section)

**Current problems:** Wall of text, too wide, highlights inconsistent.

**New design:**
- Section heading: `text-h2` with Lucide `FileText` icon (20px)
- Content wrapper: `prose-width` (max-w-[680px]) for readability
- Body text: `text-body text-secondary leading-relaxed`
- `<<highlighted>>` markers rendered as: `bg-[var(--accent-amber-subtle)] text-[var(--text-primary)] px-1 rounded font-medium` (inline highlight)
- Between paragraphs: `mb-6` spacing (generous)
- Add a reading time estimate at top: `text-caption text-tertiary` — "5 min read"

**Commit:** `style: redesign comprehensive overview with constrained prose width`

---

### Task 3.4: Redesign Core Concepts Cards

**Files:**
- Modify: `src/components/insights/EpisodeSmartFeed.tsx` (core concepts section)

**Current problems:** All identical, emoji icons, quotes hard to see.

**New design:**
- Section heading: `text-h2` with Lucide `Lightbulb` icon (20px, text-amber-500)
- Cards in vertical stack with `gap-4`
- Each card: `elevation.card p-6`
  - Top: Numbered badge (`w-7 h-7 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] text-sm font-bold flex items-center justify-center`) + concept name (`text-h3 text-primary`)
  - Explanation: `text-body text-secondary mt-3`
  - Quote (if present): `border-l-2 border-[var(--border-strong)] pl-4 mt-4 text-body-sm text-tertiary italic`
- **Collapsible:** Initially show just number + concept name. Click to expand explanation + quote. Lucide `ChevronDown` on right, rotates on expand.

**Commit:** `style: redesign core concepts with numbered badges and collapsible cards`

---

### Task 3.5: Redesign Episode Chapters

**Files:**
- Modify: `src/components/insights/EpisodeSmartFeed.tsx` (chapters section)

**Current problems:** Good structure but "PLAYING" badge hard to read, expand all easy to miss.

**New design:**
- Section heading: `text-h2` with Lucide `ListMusic` icon (20px) + "Expand All" button (ghost, right-aligned)
- Chapter list with `gap-2`:
  - Each chapter row: `rounded-xl p-4 hover:bg-[var(--surface-2)] transition-colors duration-150 cursor-pointer`
  - Left: Timestamp badge (`text-caption bg-[var(--surface-2)] px-2 py-1 rounded-md font-mono`)
  - Title: `text-h4 text-primary`
  - Hook (collapsed): `text-body-sm text-tertiary line-clamp-1`
  - **Currently playing:** `bg-[var(--primary-subtle)] border border-[var(--primary)]` + solid "Now Playing" badge (`bg-[var(--primary)] text-white text-caption px-2 py-0.5 rounded-full`)
  - **Expanded content:** `text-body text-secondary mt-3 prose-width` + "Play from XX:XX" button (`buttonSecondary`, Lucide Play icon)
  - Expand indicator: Lucide `ChevronDown` on far right, rotates on expand

**Commit:** `style: redesign episode chapters with clear playing state`

---

### Task 3.6: Redesign Contrarian Views

**Files:**
- Modify: `src/components/insights/EpisodeSmartFeed.tsx` (contrarian views section)

**Current problems:** Cards have no clear action, red icon could be refined.

**New design:**
- Section heading: `text-h2` with Lucide `Scale` icon (20px, text-red-400) + `text-body-sm text-secondary` subtitle "Alternative perspectives to consider"
- Cards: `elevation.card p-5 border-l-4 border-red-500/50`
  - Each card: `text-body text-secondary` with **bold** markers rendered as `font-semibold text-primary`
  - No action buttons (these are informational)
  - Subtle red-tinted left border distinguishes from other card types

**Commit:** `style: redesign contrarian views with distinct left border accent`

---

### Task 3.7: Redesign Transcript Section

**Files:**
- Modify: `src/components/insights/TranscriptAccordion.tsx`
- Modify: `src/components/insights/TranscriptMessage.tsx`
- Modify: `src/components/insights/TranscriptTabContent.tsx`

**Current problems:** Expand hint buried, segments too short, search could highlight better.

**New design:**
- **Accordion wrapper:** `elevation.card p-0 overflow-hidden`
  - Header bar: `px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-2)]`
  - Left: Lucide `FileText` (20px) + "Transcript" `text-h3` + stats badges (`text-caption text-tertiary` — "165 segments" dot "2 speakers")
  - Right: Lucide `ChevronDown` rotating on expand
- **Expanded content (inside accordion):**
  - Search bar: `h-10` with Lucide `Search` icon, `bg-[var(--surface-2)]`, match count shown in placeholder area
  - Speaker filter row: colored speaker pills (rounded-full, bg-surface-2, avatar initial + name), active gets `bg-[var(--primary-subtle)] text-primary border border-primary`
  - **Transcript messages:**
    - Speaker avatar: `w-8 h-8 rounded-full` with colored background (keep current 10-color system)
    - Name: `text-body-sm font-medium text-primary` + timestamp (`text-caption text-tertiary font-mono cursor-pointer hover:text-primary`)
    - Text: `text-body text-secondary` — show more text per segment (loosen line-clamp or remove)
    - Search highlight: `bg-amber-500/30 rounded px-0.5`
  - Download/Copy: `buttonGhost` with Lucide `Download` / `Copy` icons in header bar

**Commit:** `style: redesign transcript section with better search and expand UX`

---

### Task 3.8: Redesign Action Items

**Files:**
- Modify: `src/components/insights/ActionFooter.tsx`

**Current problems:** Cards cramped, checkboxes small, completion not satisfying.

**New design:**
- Section heading: `text-h2` with Lucide `CheckSquare` icon (20px, text-green-500) + progress counter `text-body-sm text-tertiary` ("2/5 done")
- Card: `elevation.card p-5`
- Each action item: `flex items-start gap-4 py-4 border-b border-[var(--border)] last:border-0`
  - Checkbox: `w-5 h-5 rounded-md border-2 border-[var(--border-strong)] cursor-pointer`
    - When checked: `bg-green-500 border-green-500` with Lucide `Check` (14px, white) — animate with scale(0→1) + checkmark draw
    - Text gets: `line-through text-tertiary` transition
  - Content:
    - Category badge: top-right, `text-caption` with appropriate color per category
    - Priority badge (if high): `bg-red-500/10 text-red-500 text-caption px-2 rounded-full`
    - Action text: `text-body text-primary` (text-secondary + line-through when checked)
    - Resource pills: `text-body-sm text-primary bg-[var(--surface-2)] px-2 py-0.5 rounded-md cursor-pointer hover:bg-[var(--surface-3)]` with external link icon
- Show first 3 items, "Show N more" button to expand (ghost style)

**Commit:** `style: redesign action items with satisfying check animations`

---

### Task 3.9: Redesign Subscription CTA Card

**Files:**
- Modify: `src/components/insights/SubscriptionCard.tsx`

**Current problems:** WhatsApp/Telegram/Email icons look emoji-like, card feels disconnected.

**New design:**
- Card: `elevation.card p-8 text-center max-w-lg mx-auto`
- Lucide `Bell` icon (32px, text-primary) centered at top
- Heading: `text-h3 text-primary` — "Get future summaries for {podcast} delivered to you"
- Subtitle: `text-body-sm text-secondary` — "Concise insights the moment a new episode drops"
- 3 notification channel buttons in a row (gap-4):
  - Each: `elevation.cardInteractive p-4 flex flex-col items-center gap-2`
  - Use Lucide icons: `MessageCircle` (WhatsApp), `Send` (Telegram), `Mail` (Email)
  - Label: `text-body-sm text-secondary`
- Trust text: `text-caption text-tertiary mt-4` — "No spam. Unsubscribe anytime."

**Commit:** `style: redesign subscription CTA with SVG icons`

---

### Task 3.10: Redesign Ask AI Bar + Chat

**Files:**
- Modify: `src/components/insights/AskAIBar.tsx`
- Modify: `src/components/insights/AskAIChatPopup.tsx`

**Current problems:** Purpose unclear, "Ask anything..." not descriptive enough.

**New AskAIBar design:**
- Standalone mode: `elevation.floating` bar, `max-w-2xl mx-auto`, centered at bottom
  - Left: Lucide `Sparkles` icon (20px, text-primary)
  - Input: `text-body text-secondary` placeholder "Ask about this episode..."
  - Right: Send button, `bg-[var(--primary)] rounded-full w-8 h-8` with Lucide `ArrowUp` icon
- Integrated mode (inside player): Compact version with same elements

**New AskAIChatPopup design:**
- Modal: `elevation.floating max-w-xl` anchored to bottom of viewport
- Header: `text-h3` "Ask AI" + Lucide `X` close button (ghost)
- Messages: clean chat bubbles
  - User: `bg-[var(--primary)] text-white rounded-2xl rounded-br-md p-3`
  - AI: `bg-[var(--surface-2)] text-primary rounded-2xl rounded-bl-md p-3`
- Suggested questions: `buttonSecondary rounded-full text-sm`

**Commit:** `style: redesign Ask AI bar and chat popup`

---

## Agent 4: Navigation, Layout & Audio Player

> **Depends on:** Agent 1 tasks 1.1–1.5 must be complete before starting.

### Task 4.1: Redesign Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Current problems:** Wireframe feel, no active state, icons tiny.

**New Sidebar design (desktop — fixed left, 256px):**
- Background: `bg-[var(--background)]` (NO blur/glass, clean solid)
- Top: Brand section:
  - Logo: Lucide `Headphones` (24px, text-primary) + "PodCatch" (`text-h3 text-primary font-bold`)
  - Below brand name: subtle `border-b border-[var(--border)] mb-4` separator
- Nav items (vertical, gap-1):
  - Each: `h-10 px-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors duration-150`
  - Icon: Lucide icons 20px
  - Label: `text-body text-secondary font-medium`
  - **Active state:** `bg-[var(--primary-subtle)] text-[var(--primary)]` — both icon and label turn primary
  - **Hover (inactive):** `bg-[var(--surface-2)] text-primary`
  - Items: Discover (Lucide `Compass`), My Podcasts (Lucide `Library`), Summaries (Lucide `BookOpen`), Saved (Lucide `Bookmark`), Settings (Lucide `Settings`)
- Bottom: User section
  - Avatar (32x32 rounded-full) + name (text-body-sm font-medium) + settings gear
  - If not logged in: "Sign In" button (buttonPrimary, sm)
- Mobile: Sliding drawer from left with overlay (`elevation.overlay`)
  - Close button: Lucide `X` (ghost, top-right of drawer)

**Commit:** `style: redesign sidebar with active states and clean layout`

---

### Task 4.2: Redesign AppShell Layout

**Files:**
- Modify: `src/components/AppShell.tsx`

**Current problems:** Navigation inconsistency between pages.

**New design:**
- **Consistent layout across ALL pages:** Sidebar + main content area
- Desktop: Sidebar (256px fixed left) + main content with `pl-64` padding
- Mobile: Top bar (h-14, logo + hamburger) + content + bottom nav bar (h-14)
- Mobile bottom nav: 5 items (Discover, Podcasts, Summaries, Saved, Settings) — same as sidebar items
  - Each: `flex flex-col items-center gap-1 text-[10px]` with icon (20px)
  - Active: `text-primary`, inactive: `text-tertiary`
- Ensure main content scrolls independently from sidebar
- Audio player sits above mobile bottom nav (z-index: `z-40` player, `z-30` bottom nav)

**Commit:** `style: redesign app shell with consistent sidebar + mobile bottom nav`

---

### Task 4.3: Redesign StickyAudioPlayer

**Files:**
- Modify: `src/components/StickyAudioPlayer.tsx`

**Current problems:** Basic, colored chapter bar hard to read.

**New design:**
- **Collapsed state (default):** Sticky bottom bar, `h-16`
  - KEEP glass effect here: `backdrop-blur-xl bg-[var(--background)]/80 border-t border-[var(--border)]`
  - Left: Track artwork (44x44, rounded-lg) + title/artist (text-body-sm/text-caption truncate)
  - Center: Play/pause (green, 40x40 rounded-full) with skip-back/forward (ghost, 32x32)
  - Right: Time display (font-mono text-caption), volume, expand chevron
  - Progress: Full-width thin bar (h-1) at very top of player, `bg-[var(--primary)]` on track, `bg-[var(--surface-3)]` for remaining
  - Chapter segments: Subtle `|` dividers in the progress bar (hairline white, opacity 30%)

- **Expanded state:** Slides up to show:
  - Larger artwork (120x120, rounded-2xl, shadow-floating)
  - Full controls with seek slider (`h-1.5 rounded-full`)
  - Chapter name below progress bar: `text-caption text-tertiary`
  - Speed selector: pills (0.5x, 1x, 1.5x, 2x) — active: `bg-[var(--surface-2)] text-primary`, inactive: `text-tertiary`
  - AskAI bar integration below controls

**Commit:** `style: redesign sticky audio player with collapsed/expanded states`

---

### Task 4.4: Redesign Podcast Detail Page

**Files:**
- Modify: `src/app/browse/podcast/[id]/page.tsx` (or wherever the podcast page is)

**Current problems:** Sparse header, monotonous episode list, "Follow Podcast" not prominent.

**New design (header):**
- Podcast artwork: `160x160 rounded-2xl shadow-3` on left
- Right of artwork:
  - Podcast name: `text-display text-primary`
  - Publisher: `text-body text-secondary`
  - Tag pills: `badge secondary` variant, `gap-2`
  - Stats: `text-body-sm text-tertiary` — episode count + language
  - CTA row: "Follow" button (`buttonPrimary lg` with Lucide Heart icon) + "Share" button (`buttonGhost lg`)
  - Description: `text-body text-secondary line-clamp-3` with "Read more" toggle

**New design (episode list):**
- Section heading: `text-h2` "Latest Episodes" + count badge
- Episode rows: Cleaner with subtle hover:
  - `py-4 border-b border-[var(--border)] hover:bg-[var(--surface-2)] rounded-xl px-4 -mx-4 transition-colors cursor-pointer`
  - Left column: Date + Duration (`text-caption text-tertiary`)
  - Middle: Title (`text-h4 text-primary`) + description preview (`text-body-sm text-secondary line-clamp-2`)
  - Right: Action buttons (Play green pill + Summarize/View Summary secondary pill)
  - **Visual indicators:**
    - If summary ready: small `bg-green-500 w-2 h-2 rounded-full` dot next to title
    - If currently playing: animated sound wave icon replacing the dot

**Commit:** `style: redesign podcast detail page with premium header`

---

## Devil Agent: Quality Review Checklist

After EACH agent completes a task, the devil agent reviews against this checklist:

### Contrast & Readability
- [ ] All `text-primary` on `background` meets 4.5:1 ratio
- [ ] All `text-secondary` on `background` meets 4.5:1 ratio
- [ ] All `text-tertiary` on `background` meets 3:1 ratio (decorative allowed)
- [ ] Primary colored text on subtle backgrounds is legible
- [ ] No text uses raw zinc-400/gray-400 on dark backgrounds (too dim)

### Design Token Compliance
- [ ] ZERO raw color values (no `#hex` or `rgb()` inline) — all via CSS variables or Tailwind classes mapped to tokens
- [ ] No residual glass morphism (except player + modals)
- [ ] No `bg-white/10` or low-opacity backgrounds on surfaces (old glass pattern)
- [ ] All shadows use the defined elevation scale

### Interaction
- [ ] Every clickable element has `cursor-pointer`
- [ ] Every interactive element has `transition-colors duration-150` (or `transition-all duration-150`)
- [ ] Hover states don't cause layout shift (no `scale` on cards — only shadow/color changes)
- [ ] Focus-visible rings are present (`ring-2 ring-[var(--primary)]`)
- [ ] Touch targets meet 44x44px minimum

### Typography
- [ ] Headings use Plus Jakarta Sans (via utility classes or font-family variable)
- [ ] Body text uses Inter
- [ ] No heading uses the body font
- [ ] Prose content respects max-width 680px
- [ ] Line heights: headings 1.2, body 1.6

### Icons
- [ ] ZERO emoji used as functional icons (lightbulb, clock, sparkles, etc. must be Lucide SVG)
- [ ] All icons from Lucide React (no mixing icon sets)
- [ ] Consistent icon sizing: 16px inline, 20px buttons/nav, 24px section headers
- [ ] Icon stroke width: 1.5px (Lucide default)

### Spacing & Layout
- [ ] Section gaps are consistently 48px (`gap-12` or `mb-12`)
- [ ] Card padding is 20px desktop, 16px mobile
- [ ] Container max-width consistent (`max-w-6xl` on discover, `max-w-4xl` on insights)
- [ ] No content hidden behind fixed navbar or player
- [ ] Responsive at 375px, 768px, 1024px, 1440px

### Theme Consistency
- [ ] Both dark AND light themes look correct (not just dark)
- [ ] Borders visible in both themes
- [ ] No hardcoded dark-only or light-only styles without the proper `dark:` prefix
- [ ] Color scheme transitions are smooth

### Performance
- [ ] Images use Next.js `Image` with lazy loading
- [ ] No new large dependencies added
- [ ] Skeleton loaders present during async loads
- [ ] `prefers-reduced-motion` respected on animations

---

## Execution Order

```
Phase 1 (Agent 1 — Sequential, blocking):
  Task 1.1 → 1.2 → 1.3 → 1.4 → 1.5
  [Devil reviews foundation before proceeding]

Phase 2 (Agents 2, 3, 4 — Parallel):
  Agent 2: Task 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6
  Agent 3: Task 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8 → 3.9 → 3.10
  Agent 4: Task 4.1 → 4.2 → 4.3 → 4.4
  [Devil reviews each completed task]

Phase 3 (Integration — Sequential):
  - Full visual QA pass across all pages
  - Cross-page navigation consistency check
  - Mobile responsive pass (375px, 768px)
  - Light theme verification
  - Final devil agent review
```

## Out of Scope (Explicitly Deferred)

- **Onboarding wizard** — no changes per user request
- **YouTube video summarization** — display only, implementation deferred to next task
- **Admin panel** — no redesign needed
- **Settings page** — deferred to separate task
- **Data layer / API changes** — this is strictly presentation layer
- **New features** — no new functionality, only visual/UX improvements

---

## Notes for Agents

1. **Import paths:** The codebase uses `@/` path aliases pointing to `./src/`
2. **Tailwind 4:** Uses `@theme` directive in CSS, NOT `tailwind.config.ts`. All theme changes go in `globals.css`
3. **RTL support:** Many users are Hebrew-speaking. Maintain RTL text detection in `src/lib/rtl.ts`. Don't break directional layouts.
4. **Framer Motion:** Already installed (v12.29). Use for enter/exit animations on expandable sections and modal transitions. Keep durations 150-300ms.
5. **Lucide icons:** Already installed (v0.563). Import like `import { Play, Sparkles } from 'lucide-react'`
6. **Glass to Elevation migration:** When updating component imports from `glass` → `elevation`, verify EVERY usage — there are ~20+ files importing glass.ts
7. **Testing:** After each task, verify both themes (toggle in Settings or use browser devtools to switch `dark` class on `<html>`), verify at mobile width (375px), verify no TypeScript errors (`npx tsc --noEmit`)
