# Smart YouTube Channel Filtering - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Swap onboarding step order (Genres before YouTube) and use YouTube Topics API + Gemini Flash fallback to auto-classify and pre-select only relevant YouTube channels based on user's genre preferences.

**Architecture:** New `POST /api/youtube/classify` endpoint batch-fetches YouTube `topicDetails`, maps them to Apple Podcast genres via a static mapping, and falls back to Gemini Flash for unclassified channels. Frontend swaps step order and splits channel list into matched (pre-selected) and other (deselected) sections.

**Tech Stack:** Next.js API routes, YouTube Data API v3 (`channels.list?part=topicDetails`), `@google/generative-ai` (already installed), Gemini Flash

---

### Task 1: Add YouTube Topic → Genre Mapping

**Files:**
- Create: `src/lib/youtube/topic-genre-map.ts`

**Step 1: Create the static mapping file**

```typescript
// src/lib/youtube/topic-genre-map.ts

/**
 * Maps YouTube topicDetails category IDs (Freebase/Wikipedia mid) to Apple Podcast genre IDs.
 * YouTube API returns these in channels.list?part=topicDetails as topicCategories URLs
 * like "https://en.wikipedia.org/wiki/Technology" — we extract the topic and map by mid.
 *
 * Reference: https://developers.google.com/youtube/v3/docs/channels#topicDetails
 */

// YouTube topic IDs (mid) → Apple Podcast genre IDs
export const YOUTUBE_TOPIC_TO_GENRE: Record<string, string[]> = {
  // Technology
  '/m/07c1v': ['1318'],           // Technology
  '/m/01k8wb': ['1304'],          // Knowledge → Education

  // Business
  '/m/09s1f': ['1321'],           // Business

  // Entertainment
  '/m/02jjt': ['1310'],           // Entertainment → TV & Film
  '/m/0f2f9': ['1310'],           // TV shows → TV & Film
  '/m/02vxn': ['1310'],           // Movies → TV & Film
  '/m/0bzvm2': ['1310'],          // Gaming → TV & Film

  // Music
  '/m/04rlf': ['1309'],           // Music
  '/m/02mscn': ['1309', '1314'],  // Christian music → Music + Religion

  // Comedy
  '/m/09kqc': ['1303'],           // Humor → Comedy
  '/m/0410tth': ['1303'],         // Humor (alt) → Comedy

  // Sports
  '/m/06ntj': ['1545'],           // Sports

  // Science
  '/m/05qt0': ['1533'],           // Science

  // Health & Fitness
  '/m/0kt51': ['1305'],           // Health
  '/m/019_rr': ['1305'],          // Lifestyle → Health & Fitness

  // Society & Culture
  '/m/098wr': ['1324'],           // Society → Society & Culture
  '/m/03glg': ['1324'],           // Hobby → Society & Culture
  '/m/068hy': ['1324'],           // Pets → Society & Culture
  '/m/041xxh': ['1324'],          // Food → Society & Culture
  '/m/032tl': ['1324'],           // Fashion → Society & Culture

  // News
  '/m/05jhg': ['1489'],           // News

  // Education
  '/m/01k8wb': ['1304'],          // Knowledge → Education

  // Kids & Family
  '/m/01mw1': ['1307'],           // Children → Kids & Family

  // Arts
  '/m/017rf': ['1301'],           // Acting → Arts
  '/m/0403l': ['1301'],           // Visual arts → Arts
  '/m/05qjc': ['1301'],           // Performing arts → Arts

  // Religion & Spirituality
  '/m/06bvp': ['1314'],           // Religion

  // Government
  '/m/0glt670': ['1511'],         // Politics → Government

  // History
  '/m/01ly5': ['1512'],           // History (if available)
};

// YouTube also returns Wikipedia URLs in topicCategories, map those too
export const YOUTUBE_WIKI_TO_GENRE: Record<string, string[]> = {
  'Technology': ['1318'],
  'Business': ['1321'],
  'Entertainment': ['1310'],
  'Music': ['1309'],
  'Comedy': ['1303'],
  'Humor': ['1303'],
  'Sport': ['1545'],
  'Sports': ['1545'],
  'Science': ['1533'],
  'Health': ['1305'],
  'Fitness': ['1305'],
  'Lifestyle': ['1305'],
  'Society': ['1324'],
  'Culture': ['1324'],
  'News': ['1489'],
  'Education': ['1304'],
  'Knowledge': ['1304'],
  'Children': ['1307'],
  'Film': ['1310'],
  'Television': ['1310'],
  'Gaming': ['1310'],
  'Video game': ['1310'],
  'Politics': ['1511'],
  'Government': ['1511'],
  'Religion': ['1314'],
  'Spirituality': ['1314'],
  'History': ['1512'],
  'Arts': ['1301'],
  'Visual arts': ['1301'],
  'Performing arts': ['1301'],
  'Fiction': ['1483'],
  'True crime': ['1481'],
  'Crime': ['1481'],
  'Hobby': ['1324'],
  'Food': ['1324'],
  'Fashion': ['1324'],
  'Pet': ['1324'],
  'Cooking': ['1324'],
};

/**
 * Extract genre IDs from YouTube topicCategories URLs.
 * YouTube returns URLs like "https://en.wikipedia.org/wiki/Technology"
 */
export function extractGenresFromTopicCategories(topicCategories: string[]): string[] {
  const genreIds = new Set<string>();

  for (const url of topicCategories) {
    // Extract the topic name from Wikipedia URL
    const match = url.match(/\/wiki\/(.+)$/);
    if (match) {
      const topic = decodeURIComponent(match[1]).replace(/_/g, ' ');
      const genres = YOUTUBE_WIKI_TO_GENRE[topic];
      if (genres) {
        genres.forEach(g => genreIds.add(g));
      }
    }
  }

  return Array.from(genreIds);
}

/**
 * Extract genre IDs from YouTube topicIds (mid format like /m/07c1v).
 */
export function extractGenresFromTopicIds(topicIds: string[]): string[] {
  const genreIds = new Set<string>();

  for (const mid of topicIds) {
    const genres = YOUTUBE_TOPIC_TO_GENRE[mid];
    if (genres) {
      genres.forEach(g => genreIds.add(g));
    }
  }

  return Array.from(genreIds);
}
```

**Step 2: Commit**

```bash
git add src/lib/youtube/topic-genre-map.ts
git commit -m "feat: add YouTube topic to Apple Podcast genre mapping"
```

---

### Task 2: Add `fetchChannelTopics` to YouTube API client

**Files:**
- Modify: `src/lib/youtube/api.ts` (add new function at end of file)

**Step 1: Add the batch topic-fetching function**

Add this to the end of `src/lib/youtube/api.ts`:

```typescript
/**
 * Batch-fetch topicDetails for a list of YouTube channel IDs.
 * Uses API key (public data). Batches in groups of 50 (YouTube API max).
 * Returns a map of channelId → { topicIds: string[], topicCategories: string[] }
 */
export async function fetchChannelTopics(
  channelIds: string[]
): Promise<Record<string, { topicIds: string[]; topicCategories: string[] }>> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[YT_API] YOUTUBE_API_KEY not set');
    return {};
  }

  const result: Record<string, { topicIds: string[]; topicCategories: string[] }> = {};
  const batchSize = 50;

  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const params = new URLSearchParams({
      part: 'topicDetails',
      id: batch.join(','),
      key: apiKey,
    });

    try {
      const res = await fetch(`${YT_API_BASE}/channels?${params}`);
      if (!res.ok) {
        console.error('[YT_API] Failed to fetch channel topics:', res.status);
        continue;
      }

      const data = await res.json();
      for (const item of data.items || []) {
        result[item.id] = {
          topicIds: item.topicDetails?.topicIds || [],
          topicCategories: item.topicDetails?.topicCategories || [],
        };
      }
    } catch (err) {
      console.error('[YT_API] Error fetching channel topics batch:', err);
    }
  }

  return result;
}
```

**Step 2: Commit**

```bash
git add src/lib/youtube/api.ts
git commit -m "feat: add fetchChannelTopics for batch topic retrieval"
```

---

### Task 3: Create the `/api/youtube/classify` endpoint

**Files:**
- Create: `src/app/api/youtube/classify/route.ts`

**Step 1: Create the classify route**

```typescript
// src/app/api/youtube/classify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { fetchChannelTopics } from '@/lib/youtube/api';
import {
  extractGenresFromTopicCategories,
  extractGenresFromTopicIds,
} from '@/lib/youtube/topic-genre-map';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { APPLE_PODCAST_GENRES } from '@/types/apple-podcasts';

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const channels: Array<{ channelId: string; title: string; description: string }> = body.channels;
  const selectedGenres: string[] = body.genres;

  if (!channels || !selectedGenres || selectedGenres.length === 0) {
    return NextResponse.json({ error: 'Missing channels or genres' }, { status: 400 });
  }

  console.log(`[YT_CLASSIFY] Classifying ${channels.length} channels against ${selectedGenres.length} genres`);

  const classifications: Record<string, string[]> = {};

  // Step 1: Fetch topicDetails from YouTube API
  const channelIds = channels.map(ch => ch.channelId);
  const topicsMap = await fetchChannelTopics(channelIds);

  const unclassified: Array<{ channelId: string; title: string; description: string }> = [];

  for (const channel of channels) {
    const topics = topicsMap[channel.channelId];
    if (topics && (topics.topicIds.length > 0 || topics.topicCategories.length > 0)) {
      // Merge genres from both topicIds (mid) and topicCategories (wiki URLs)
      const genresFromIds = extractGenresFromTopicIds(topics.topicIds);
      const genresFromCategories = extractGenresFromTopicCategories(topics.topicCategories);
      const allGenres = [...new Set([...genresFromIds, ...genresFromCategories])];

      // Filter to only genres the user selected
      const matchedGenres = allGenres.filter(g => selectedGenres.includes(g));
      classifications[channel.channelId] = matchedGenres;
    } else {
      // No topic data — needs Gemini classification
      unclassified.push(channel);
      classifications[channel.channelId] = []; // default empty
    }
  }

  console.log(`[YT_CLASSIFY] YouTube topics classified ${channels.length - unclassified.length} channels, ${unclassified.length} unclassified`);

  // Step 2: Use Gemini Flash for unclassified channels (if any)
  if (unclassified.length > 0) {
    try {
      const geminiClassifications = await classifyWithGemini(unclassified, selectedGenres);
      for (const [channelId, genres] of Object.entries(geminiClassifications)) {
        classifications[channelId] = genres;
      }
      console.log(`[YT_CLASSIFY] Gemini classified ${unclassified.length} remaining channels`);
    } catch (err) {
      console.error('[YT_CLASSIFY] Gemini fallback failed, leaving unclassified channels empty:', err);
    }
  }

  return NextResponse.json({ classifications });
}

async function classifyWithGemini(
  channels: Array<{ channelId: string; title: string; description: string }>,
  selectedGenres: string[]
): Promise<Record<string, string[]>> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[YT_CLASSIFY] GOOGLE_GEMINI_API_KEY not set');
    return {};
  }

  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const genreList = APPLE_PODCAST_GENRES
    .filter(g => selectedGenres.includes(g.id))
    .map(g => `${g.id}: ${g.name}`)
    .join('\n');

  const channelList = channels
    .map(ch => `- channelId: "${ch.channelId}" | title: "${ch.title}" | description: "${ch.description.slice(0, 200)}"`)
    .join('\n');

  const prompt = `You are classifying YouTube channels into podcast genres.

Here are the user's selected genres:
${genreList}

Here are YouTube channels to classify:
${channelList}

For each channel, return a JSON object mapping channelId to an array of matching genre IDs from the list above.
If a channel doesn't match any of the selected genres, use an empty array.
Return ONLY valid JSON, no markdown.

Example format:
{"UCxxx": ["1318"], "UCyyy": ["1321", "1318"], "UCzzz": []}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const text = result.response.text();
  return JSON.parse(text) as Record<string, string[]>;
}
```

**Step 2: Commit**

```bash
git add src/app/api/youtube/classify/route.ts
git commit -m "feat: add /api/youtube/classify endpoint with YouTube Topics + Gemini fallback"
```

---

### Task 4: Update onboarding page — swap step order

**Files:**
- Modify: `src/app/onboarding/page.tsx`

**Step 1: Change the step type and allSteps array**

In `src/app/onboarding/page.tsx`:

Change line 14:
```typescript
// No change to type — same steps, just reordered
type Step = 'welcome' | 'youtube' | 'genres' | 'done';
```

Change line 157:
```typescript
const allSteps: Step[] = ['welcome', 'genres', 'youtube', 'done'];
```

**Step 2: Change Welcome "Personalize My Feed" button to go to genres**

Change line 202:
```typescript
<Button onClick={() => setStep('genres')} className="gap-2 min-w-[200px]">
```

**Step 3: Change Genres "Continue" to go to youtube instead of finishing**

Replace `handleFinishGenres` (lines 127-129):
```typescript
const handleFinishGenres = () => {
  setStep('youtube');
};
```

**Step 4: Update YouTube "Continue" to also save genres and profile**

Replace `handleImportAndContinue` (lines 101-121):
```typescript
const handleImportAndContinue = async () => {
  setIsImporting(true);
  try {
    // Import selected channels
    if (selectedChannels.size > 0) {
      const channelsToImport = ytChannels.filter(ch => selectedChannels.has(ch.channelId));
      console.log(`[ONBOARDING] Importing ${channelsToImport.length} YouTube channels…`);
      const res = await fetch('/api/youtube/subscriptions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: channelsToImport }),
      });
      const data = await res.json();
      console.log(`[ONBOARDING] YouTube import result:`, data);
    }

    // Save genres and mark onboarding complete
    await saveAndFinish(Array.from(selectedGenres));
  } catch (err) {
    console.error('[ONBOARDING] Error:', err);
  } finally {
    setIsImporting(false);
  }
};
```

**Step 5: Update YouTube "Skip" to still save genres**

Change the YouTube Skip button (line 281):
```typescript
<Button variant="ghost" onClick={() => saveAndFinish(Array.from(selectedGenres))} disabled={isSaving}>
  Skip
</Button>
```

**Step 6: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: swap onboarding step order — genres before YouTube"
```

---

### Task 5: Add classification state and fetch logic

**Files:**
- Modify: `src/app/onboarding/page.tsx`

**Step 1: Add classification state**

After line 35 (`const [isImporting, setIsImporting] = useState(false);`), add:
```typescript
const [classifications, setClassifications] = useState<Record<string, string[]>>({});
```

**Step 2: Update the YouTube step useEffect to fetch + classify**

Replace the existing `useEffect` (lines 43-67) with:
```typescript
// Fetch YouTube subscriptions and classify when entering youtube step
useEffect(() => {
  if (step !== 'youtube') return;

  let cancelled = false;
  setIsLoadingYt(true);
  setYtError(false);

  (async () => {
    try {
      // Step 1: Fetch subscriptions
      const subsRes = await fetch('/api/youtube/subscriptions');
      const subsData = await subsRes.json();
      const subs: YouTubeChannel[] = subsData.subscriptions || [];

      if (cancelled) return;
      setYtChannels(subs);

      if (subs.length === 0) {
        setIsLoadingYt(false);
        return;
      }

      // Step 2: Classify channels against selected genres
      if (selectedGenres.size > 0) {
        try {
          const classifyRes = await fetch('/api/youtube/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channels: subs.map(ch => ({
                channelId: ch.channelId,
                title: ch.title,
                description: ch.description,
              })),
              genres: Array.from(selectedGenres),
            }),
          });
          const classifyData = await classifyRes.json();

          if (cancelled) return;

          const classMap: Record<string, string[]> = classifyData.classifications || {};
          setClassifications(classMap);

          // Pre-select only matched channels
          const matched = new Set(
            subs
              .filter(ch => (classMap[ch.channelId] || []).length > 0)
              .map(ch => ch.channelId)
          );
          setSelectedChannels(matched);
        } catch {
          // Classification failed — fallback: select all
          if (!cancelled) {
            setSelectedChannels(new Set(subs.map(ch => ch.channelId)));
          }
        }
      } else {
        // No genres selected — select all (same as before)
        setSelectedChannels(new Set(subs.map(ch => ch.channelId)));
      }
    } catch {
      if (!cancelled) setYtError(true);
    } finally {
      if (!cancelled) setIsLoadingYt(false);
    }
  })();

  return () => { cancelled = true; };
}, [step]);
```

**Step 3: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: add channel classification fetch and smart pre-selection"
```

---

### Task 6: Split channel list into matched/other sections

**Files:**
- Modify: `src/app/onboarding/page.tsx`

**Step 1: Add computed matched/other arrays before the return statement**

Before the `return` statement (around line 159), add:
```typescript
// Split channels into matched (has genres overlapping user selection) and other
const matchedChannels = ytChannels.filter(
  ch => (classifications[ch.channelId] || []).length > 0
);
const otherChannels = ytChannels.filter(
  ch => (classifications[ch.channelId] || []).length === 0
);
```

**Step 2: Replace the channel grid rendering**

Replace the channel grid section (the `<div className="grid grid-cols-1 sm:grid-cols-2...">` block, approximately lines 264-276) with:

```tsx
<div className="max-h-[340px] overflow-y-auto mb-6 pr-1 space-y-2">
  {/* Matched channels */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {matchedChannels.map((channel) => (
      <YouTubeChannelCard
        key={channel.channelId}
        channelId={channel.channelId}
        name={channel.title}
        thumbnailUrl={channel.thumbnailUrl}
        description={channel.description}
        selected={selectedChannels.has(channel.channelId)}
        onToggle={toggleChannel}
      />
    ))}
  </div>

  {/* Divider — only show if both sections have content */}
  {matchedChannels.length > 0 && otherChannels.length > 0 && (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Other channels (not matched to your interests)
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )}

  {/* Other channels */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {otherChannels.map((channel) => (
      <YouTubeChannelCard
        key={channel.channelId}
        channelId={channel.channelId}
        name={channel.title}
        thumbnailUrl={channel.thumbnailUrl}
        description={channel.description}
        selected={selectedChannels.has(channel.channelId)}
        onToggle={toggleChannel}
      />
    ))}
  </div>
</div>
```

**Step 3: Update the loading message**

Replace the loading spinner text (line 236):
```typescript
<p className="text-sm text-muted-foreground">Loading and filtering your subscriptions...</p>
```

**Step 4: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: split YouTube channels into matched/other sections with divider"
```

---

### Task 7: Build verification

**Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 2: Fix any build errors if they occur**

Common issues to watch for:
- Missing imports
- Type mismatches in classifications state
- ESLint warnings about unused variables

**Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues"
```

---

### Summary of files changed

| File | Action |
|------|--------|
| `src/lib/youtube/topic-genre-map.ts` | Create — static mapping + helper functions |
| `src/lib/youtube/api.ts` | Modify — add `fetchChannelTopics()` |
| `src/app/api/youtube/classify/route.ts` | Create — classify endpoint |
| `src/app/onboarding/page.tsx` | Modify — swap steps, add classification, split channel list |
