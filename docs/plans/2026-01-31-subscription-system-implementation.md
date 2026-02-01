# Subscription System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decouple podcast subscriptions from episode summaries by introducing a user-specific `podcast_subscriptions` junction table.

**Architecture:** Create a new `podcast_subscriptions` table that links users to podcasts they explicitly subscribe to (via Heart button). The `podcasts` table remains a global catalog of podcast metadata. My Podcasts page queries subscriptions, not the raw podcasts table. Episode import only touches podcasts/episodes tables, never subscriptions.

**Tech Stack:** Supabase (PostgreSQL), Next.js API Routes, React components, TypeScript

---

## Task 1: Create Database Migration

**Files:**
- Create: `src/db/migrations/006_podcast_subscriptions.sql`

**Step 1: Write the migration SQL**

```sql
-- Migration: 006_podcast_subscriptions.sql
-- Purpose: Create junction table for user podcast subscriptions
-- This decouples "subscribing to a podcast" from "having podcast metadata for episodes"

-- Create the subscriptions table
CREATE TABLE IF NOT EXISTS podcast_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, podcast_id)
);

-- Add index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_podcast_subscriptions_user_id
  ON podcast_subscriptions(user_id);

-- Add index for podcast lookups (for counting subscribers)
CREATE INDEX IF NOT EXISTS idx_podcast_subscriptions_podcast_id
  ON podcast_subscriptions(podcast_id);

-- Add latest_episode_date to podcasts table for badge logic
ALTER TABLE podcasts
  ADD COLUMN IF NOT EXISTS latest_episode_date TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE podcast_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth yet, will be restricted when auth is added)
CREATE POLICY "Allow all operations on podcast_subscriptions"
  ON podcast_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE podcast_subscriptions IS 'Tracks which users have subscribed to which podcasts via the Heart button';
COMMENT ON COLUMN podcast_subscriptions.last_viewed_at IS 'Used for new episode badge - compare with podcasts.latest_episode_date';
```

**Step 2: Apply migration to Supabase**

Run in Supabase SQL Editor or via CLI:
```bash
# Copy the SQL and run in Supabase Dashboard > SQL Editor
# Or if using Supabase CLI:
supabase db push
```

**Step 3: Verify migration**

Run in Supabase SQL Editor:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'podcast_subscriptions';
```

Expected: `id`, `user_id`, `podcast_id`, `created_at`, `last_viewed_at`

---

## Task 2: Add TypeScript Types

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add subscription types**

Add to the end of `src/types/database.ts`:

```typescript
// Podcast Subscription Types
export interface PodcastSubscription {
  id: string;
  user_id: string;
  podcast_id: string;
  created_at: string;
  last_viewed_at: string;
}

export interface PodcastWithSubscription extends Podcast {
  subscription?: PodcastSubscription;
  has_new_episodes?: boolean;
}
```

**Step 2: Update Podcast interface**

Find the `Podcast` interface and add the new column:

```typescript
export interface Podcast {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  rss_feed_url: string;
  image_url: string | null;
  language: string;
  created_at: string;
  latest_episode_date: string | null;  // ADD THIS LINE
}
```

---

## Task 3: Create Subscription API Routes

**Files:**
- Create: `src/app/api/subscriptions/route.ts`
- Create: `src/app/api/subscriptions/[podcastId]/route.ts`
- Create: `src/app/api/subscriptions/check/route.ts`

### Step 1: Create main subscriptions route

Create `src/app/api/subscriptions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all subscribed podcasts for a user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // Get subscriptions with podcast details
    const { data: subscriptions, error } = await supabase
      .from('podcast_subscriptions')
      .select(`
        id,
        created_at,
        last_viewed_at,
        podcasts (
          id,
          title,
          author,
          description,
          rss_feed_url,
          image_url,
          language,
          created_at,
          latest_episode_date
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform and add has_new_episodes flag
    const podcastsWithStatus = (subscriptions || []).map((sub: any) => {
      const podcast = sub.podcasts;
      const hasNewEpisodes = podcast.latest_episode_date && sub.last_viewed_at
        ? new Date(podcast.latest_episode_date) > new Date(sub.last_viewed_at)
        : false;

      return {
        ...podcast,
        subscription: {
          id: sub.id,
          created_at: sub.created_at,
          last_viewed_at: sub.last_viewed_at,
        },
        has_new_episodes: hasNewEpisodes,
      };
    });

    return NextResponse.json({ podcasts: podcastsWithStatus });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

// POST: Subscribe to a podcast
export async function POST(request: NextRequest) {
  try {
    const { userId, podcastId } = await request.json();

    if (!userId || !podcastId) {
      return NextResponse.json(
        { error: 'userId and podcastId are required' },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('podcast_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('podcast_id', podcastId)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Already subscribed', id: existing.id });
    }

    // Create subscription
    const { data: subscription, error } = await supabase
      .from('podcast_subscriptions')
      .insert({
        user_id: userId,
        podcast_id: podcastId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
```

### Step 2: Create unsubscribe route

Create `src/app/api/subscriptions/[podcastId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DELETE: Unsubscribe from a podcast
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ podcastId: string }> }
) {
  const { podcastId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('podcast_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('podcast_id', podcastId);

    if (error) throw error;

    return NextResponse.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

// PATCH: Update last_viewed_at (for badge logic)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ podcastId: string }> }
) {
  const { podcastId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('podcast_subscriptions')
      .update({ last_viewed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('podcast_id', podcastId);

    if (error) throw error;

    return NextResponse.json({ message: 'Updated last viewed' });
  } catch (error) {
    console.error('Error updating last viewed:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
```

### Step 3: Create subscription check route

Create `src/app/api/subscriptions/check/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Check subscription status for multiple podcasts
export async function POST(request: NextRequest) {
  try {
    const { userId, podcastIds } = await request.json();

    if (!userId || !podcastIds || !Array.isArray(podcastIds)) {
      return NextResponse.json(
        { error: 'userId and podcastIds array are required' },
        { status: 400 }
      );
    }

    const { data: subscriptions, error } = await supabase
      .from('podcast_subscriptions')
      .select('podcast_id')
      .eq('user_id', userId)
      .in('podcast_id', podcastIds);

    if (error) throw error;

    // Create a map of podcast_id -> isSubscribed
    const subscribedIds = new Set((subscriptions || []).map(s => s.podcast_id));
    const statusMap: Record<string, boolean> = {};

    podcastIds.forEach(id => {
      statusMap[id] = subscribedIds.has(id);
    });

    return NextResponse.json({ subscriptions: statusMap });
  } catch (error) {
    console.error('Error checking subscriptions:', error);
    return NextResponse.json({ error: 'Failed to check subscriptions' }, { status: 500 });
  }
}
```

---

## Task 4: Update My Podcasts Page

**Files:**
- Modify: `src/app/my-podcasts/page.tsx`

**Step 1: Rewrite the page to use subscriptions**

Replace the entire content of `src/app/my-podcasts/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { PodcastCard } from '@/components/PodcastCard';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';

interface PodcastWithStatus {
  id: string;
  title: string;
  author: string | null;
  image_url: string | null;
  rss_feed_url: string;
  latest_episode_date: string | null;
  subscription: {
    id: string;
    created_at: string;
    last_viewed_at: string;
  };
  has_new_episodes: boolean;
}

// Temporary user ID until auth is implemented
const TEMP_USER_ID = 'anonymous-user';

export default function MyPodcastsPage() {
  const [podcasts, setPodcasts] = useState<PodcastWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`/api/subscriptions?userId=${TEMP_USER_ID}`);
      if (!response.ok) throw new Error('Failed to fetch subscriptions');

      const data = await response.json();
      setPodcasts(data.podcasts || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to load your podcasts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleUnsubscribe = async (podcastId: string) => {
    try {
      const response = await fetch(
        `/api/subscriptions/${podcastId}?userId=${TEMP_USER_ID}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to unsubscribe');

      // Remove from local state
      setPodcasts(prev => prev.filter(p => p.id !== podcastId));
    } catch (err) {
      console.error('Error unsubscribing:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <LoadingState message="Loading your podcasts..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (podcasts.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
        <EmptyState
          type="podcasts"
          title="No subscribed podcasts"
          description="Click the heart icon on any podcast to add it to your collection."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Podcasts</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {podcasts.map((podcast) => (
          <PodcastCard
            key={podcast.id}
            podcast={podcast}
            hasNewEpisodes={podcast.has_new_episodes}
            onRemove={() => handleUnsubscribe(podcast.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Task 5: Update PodcastCard Component

**Files:**
- Modify: `src/components/PodcastCard.tsx`

**Step 1: Add new episode badge support**

Read the current file first, then update it to include the badge:

```typescript
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';

interface PodcastCardProps {
  podcast: {
    id: string;
    title: string;
    author: string | null;
    image_url: string | null;
  };
  hasNewEpisodes?: boolean;
  onRemove?: () => void;
}

export function PodcastCard({ podcast, hasNewEpisodes, onRemove }: PodcastCardProps) {
  return (
    <div className="group relative">
      <Link href={`/podcast/${podcast.id}`} className="block">
        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          {podcast.image_url ? (
            <Image
              src={podcast.image_url}
              alt={podcast.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}

          {/* New Episode Badge */}
          {hasNewEpisodes && (
            <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              NEW
            </div>
          )}
        </div>

        <div className="mt-2">
          <h3 className="font-medium text-sm truncate">{podcast.title}</h3>
          {podcast.author && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {podcast.author}
            </p>
          )}
        </div>
      </Link>

      {/* Remove Button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove from My Podcasts"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      )}
    </div>
  );
}
```

---

## Task 6: Update ApplePodcastCard Heart Button

**Files:**
- Modify: `src/components/ApplePodcastCard.tsx`

**Step 1: Update heart button to use subscription API**

The heart button needs to:
1. Check subscription status on mount
2. Toggle subscription via new API
3. NOT use the old `/api/podcasts/add` route

Find and update the `handleLove` function and add subscription checking:

```typescript
// Add these at the top of the component:
const TEMP_USER_ID = 'anonymous-user';

// Add state for subscription
const [isSubscribed, setIsSubscribed] = useState(false);
const [isLoading, setIsLoading] = useState(false);

// Check subscription status on mount
useEffect(() => {
  const checkSubscription = async () => {
    // First we need the internal podcast ID
    // This requires the podcast to exist in our DB
    // For now, we'll check if this Apple podcast has been added
    try {
      const response = await fetch('/api/subscriptions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEMP_USER_ID,
          appleIds: [podcast.id.toString()],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(data.subscriptions?.[podcast.id.toString()] || false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  checkSubscription();
}, [podcast.id]);

// Update handleLove function
const handleLove = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (isLoading) return;
  setIsLoading(true);

  try {
    const appleRssUrl = `apple:${podcast.id}`;

    if (isSubscribed) {
      // Unsubscribe - need to get internal podcast ID first
      const lookupResponse = await fetch(`/api/podcasts/lookup?rss_url=${encodeURIComponent(appleRssUrl)}`);
      if (lookupResponse.ok) {
        const { podcastId } = await lookupResponse.json();
        await fetch(`/api/subscriptions/${podcastId}?userId=${TEMP_USER_ID}`, {
          method: 'DELETE',
        });
        setIsSubscribed(false);
      }
    } else {
      // Subscribe - first ensure podcast exists, then subscribe
      const addResponse = await fetch('/api/podcasts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rss_url: appleRssUrl }),
      });

      if (addResponse.ok) {
        const { id: podcastId } = await addResponse.json();

        // Now create subscription
        await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: TEMP_USER_ID,
            podcastId,
          }),
        });

        setIsSubscribed(true);
      }
    }
  } catch (error) {
    console.error('Error toggling subscription:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Step 2: Update the heart button UI**

```typescript
// Update the heart button JSX
<button
  onClick={handleLove}
  disabled={isLoading}
  className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
    isLoading ? 'opacity-50 cursor-not-allowed' : ''
  } ${
    isSubscribed
      ? 'bg-red-500 text-white'
      : 'bg-black/50 hover:bg-black/70 text-white'
  }`}
  title={isSubscribed ? 'Remove from My Podcasts' : 'Add to My Podcasts'}
>
  <Heart
    className={`w-5 h-5 ${isSubscribed ? 'fill-current' : ''}`}
  />
</button>
```

---

## Task 7: Create Podcast Lookup API

**Files:**
- Create: `src/app/api/podcasts/lookup/route.ts`

**Step 1: Create lookup endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Lookup podcast by RSS URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rssUrl = searchParams.get('rss_url');

  if (!rssUrl) {
    return NextResponse.json({ error: 'rss_url is required' }, { status: 400 });
  }

  try {
    const { data: podcast, error } = await supabase
      .from('podcasts')
      .select('id')
      .eq('rss_feed_url', rssUrl)
      .single();

    if (error || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    return NextResponse.json({ podcastId: podcast.id });
  } catch (error) {
    console.error('Error looking up podcast:', error);
    return NextResponse.json({ error: 'Failed to lookup podcast' }, { status: 500 });
  }
}
```

---

## Task 8: Update Podcasts Add API to Return ID

**Files:**
- Modify: `src/app/api/podcasts/add/route.ts`

**Step 1: Ensure the API returns the podcast ID**

Find the success response and update it to include the podcast ID:

```typescript
// After inserting or finding existing podcast, return the ID:
return NextResponse.json({
  id: podcast.id,
  title: podcast.title,
  message: 'Podcast added successfully'
});
```

---

## Task 9: Update Subscription Check to Support Apple IDs

**Files:**
- Modify: `src/app/api/subscriptions/check/route.ts`

**Step 1: Add support for checking by Apple IDs**

Update the check route to handle Apple podcast IDs:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, podcastIds, appleIds } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const statusMap: Record<string, boolean> = {};

    // Check by internal podcast IDs
    if (podcastIds && Array.isArray(podcastIds) && podcastIds.length > 0) {
      const { data: subscriptions } = await supabase
        .from('podcast_subscriptions')
        .select('podcast_id')
        .eq('user_id', userId)
        .in('podcast_id', podcastIds);

      const subscribedIds = new Set((subscriptions || []).map(s => s.podcast_id));
      podcastIds.forEach(id => {
        statusMap[id] = subscribedIds.has(id);
      });
    }

    // Check by Apple podcast IDs
    if (appleIds && Array.isArray(appleIds) && appleIds.length > 0) {
      const appleRssUrls = appleIds.map(id => `apple:${id}`);

      // First, find podcasts by their apple RSS URLs
      const { data: podcasts } = await supabase
        .from('podcasts')
        .select('id, rss_feed_url')
        .in('rss_feed_url', appleRssUrls);

      if (podcasts && podcasts.length > 0) {
        const podcastIdList = podcasts.map(p => p.id);

        // Then check subscriptions for these podcasts
        const { data: subscriptions } = await supabase
          .from('podcast_subscriptions')
          .select('podcast_id')
          .eq('user_id', userId)
          .in('podcast_id', podcastIdList);

        const subscribedPodcastIds = new Set((subscriptions || []).map(s => s.podcast_id));

        // Map back to apple IDs
        podcasts.forEach(podcast => {
          const appleId = podcast.rss_feed_url.replace('apple:', '');
          statusMap[appleId] = subscribedPodcastIds.has(podcast.id);
        });
      }

      // Mark any apple IDs not found as not subscribed
      appleIds.forEach(id => {
        if (!(id in statusMap)) {
          statusMap[id] = false;
        }
      });
    }

    return NextResponse.json({ subscriptions: statusMap });
  } catch (error) {
    console.error('Error checking subscriptions:', error);
    return NextResponse.json({ error: 'Failed to check subscriptions' }, { status: 500 });
  }
}
```

---

## Task 10: Update Episode Import to Set latest_episode_date

**Files:**
- Modify: `src/app/api/episodes/import/route.ts`

**Step 1: Update podcast's latest_episode_date when importing episodes**

After creating or finding an episode, update the podcast's latest_episode_date:

```typescript
// After episode is created/found, update podcast's latest_episode_date
if (episode.publishedAt) {
  await supabase
    .from('podcasts')
    .update({
      latest_episode_date: episode.publishedAt
    })
    .eq('id', podcastId)
    .lt('latest_episode_date', episode.publishedAt); // Only update if newer
}
```

---

## Task 11: Update Podcast Detail Page to Mark as Viewed

**Files:**
- Modify: `src/app/podcast/[id]/page.tsx`

**Step 1: Call PATCH to update last_viewed_at when user views podcast**

Add this effect to the podcast detail page:

```typescript
const TEMP_USER_ID = 'anonymous-user';

// Update last_viewed_at when viewing a subscribed podcast
useEffect(() => {
  const updateLastViewed = async () => {
    try {
      await fetch(`/api/subscriptions/${podcastId}?userId=${TEMP_USER_ID}`, {
        method: 'PATCH',
      });
    } catch (error) {
      // Silently fail - user might not be subscribed
    }
  };

  updateLastViewed();
}, [podcastId]);
```

---

## Summary of Files Changed

| Task | Action | File |
|------|--------|------|
| 1 | Create | `src/db/migrations/006_podcast_subscriptions.sql` |
| 2 | Modify | `src/types/database.ts` |
| 3 | Create | `src/app/api/subscriptions/route.ts` |
| 3 | Create | `src/app/api/subscriptions/[podcastId]/route.ts` |
| 3 | Create | `src/app/api/subscriptions/check/route.ts` |
| 4 | Modify | `src/app/my-podcasts/page.tsx` |
| 5 | Modify | `src/components/PodcastCard.tsx` |
| 6 | Modify | `src/components/ApplePodcastCard.tsx` |
| 7 | Create | `src/app/api/podcasts/lookup/route.ts` |
| 8 | Modify | `src/app/api/podcasts/add/route.ts` |
| 9 | Modify | `src/app/api/subscriptions/check/route.ts` |
| 10 | Modify | `src/app/api/episodes/import/route.ts` |
| 11 | Modify | `src/app/podcast/[id]/page.tsx` |

---

## Testing Checklist

After implementation, verify:

1. [ ] New migration applied successfully
2. [ ] Heart button subscribes user to podcast
3. [ ] Heart button unsubscribes when clicked again
4. [ ] My Podcasts shows ONLY subscribed podcasts
5. [ ] Summarizing an episode does NOT add to My Podcasts
6. [ ] New episode badge appears for podcasts with new content
7. [ ] Badge disappears after viewing the podcast
8. [ ] TypeScript compiles without errors
9. [ ] App builds successfully
