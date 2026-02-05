# Discover Page Architecture Flow

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Loads /discover                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             v
                    ┌────────────────┐
                    │  Discover Page │
                    │  (Client)      │
                    └───────┬────────┘
                            │
                            ├─── [1] Fetch Top Podcasts
                            │
                            v
                    ┌─────────────────────┐
                    │ /api/apple/top      │
                    │ ┌─────────────────┐ │
                    │ │ Cache Check     │ │
                    │ │ TTL: 1 hour     │ │
                    │ └────┬────────────┘ │
                    │      │ Hit? <50ms   │
                    │      v              │
                    │ [iTunes API: 2.6s]  │
                    └──────┬──────────────┘
                           │ Returns 30 podcasts
                           │
                           v
                  ┌────────────────┐
                  │ Split Podcasts │
                  ├────────────────┤
                  │ Hero: 0-4      │
                  │ Feed: 5-9      │
                  │ More: 10-29    │
                  └───┬─────────┬──┘
                      │         │
        [2] Hero      │         │      [3] Feed
        Episodes      │         │      Episodes
                      v         v
        ┌─────────────────────────────────────┐
        │  /api/batch-episodes (PARALLEL)     │
        ├─────────────────────────────────────┤
        │  Hero (5 pods, 1 ep each)           │
        │  Feed (5 pods, 3 eps each)          │
        │                                     │
        │  ┌───────────────────────────────┐  │
        │  │ Promise.allSettled()          │  │
        │  │ ┌──────────────────────────┐  │  │
        │  │ │ For each podcast:        │  │  │
        │  │ │ ┌──────────────────────┐ │  │  │
        │  │ │ │ Promise.race([       │ │  │  │
        │  │ │ │   fetchEpisodes(),   │ │  │  │
        │  │ │ │   timeout(5s)        │ │  │  │
        │  │ │ │ ])                   │ │  │  │
        │  │ │ └──────────────────────┘ │  │  │
        │  │ │ Parallel execution      │  │  │
        │  │ └──────────────────────────┘  │  │
        │  └───────────────────────────────┘  │
        └─────────────────────────────────────┘
                      │         │
                      v         v
        ┌─────────────────────────────────────┐
        │  getPodcastEpisodes()               │
        ├─────────────────────────────────────┤
        │  Feed Size Check: 50MB max          │
        │  ├─ Direct feed fetch                │
        │  ├─ Or RSSHub proxy                 │
        │  └─ Parse with rss-parser           │
        └─────────────────────────────────────┘
                      │
                      v
        ┌─────────────────────────────────────┐
        │  Render Components                  │
        ├─────────────────────────────────────┤
        │  ├─ DailyMixCarousel (Hero)         │
        │  ├─ BrandShelf (Top Podcasts)       │
        │  └─ CuriosityFeed (Episodes)        │
        └─────────────────────────────────────┘
```

## Timing Diagram (Optimized)

```
Time →  0s         1s         2s         3s         4s         5s
        |----------|----------|----------|----------|----------|

User    [Load page]
           |
Skeleton   |==|  (instant)
           |
Top API       |==| (cached: <50ms) or [=================] (2.6s)
              |
              +──┐
                 |
Hero Batch       |========================| (3-4s max, with 5s timeout)
                 |                        |
Feed Batch       |========================| (3-4s max, with 5s timeout)
                 |                        |
                 |                        |
Content          |                        |====| (render)
                 |                        |
                 └────────────────────────┘
                      PARALLEL EXECUTION

Total Time: 2-3 seconds (cached) or 4-5 seconds (uncached)
```

## Timing Diagram (Before - Sequential)

```
Time →  0s    2s    4s    6s    8s    10s   12s   14s
        |-----|-----|-----|-----|-----|-----|-----|

User    [Load page]
           |
Top API       |====================| (2.6s)
              |
Hero Batch           |================| (4s)
                     |
Feed Batch                  |================| (4s)
                            |
Content                            |==| (render)

Total Time: 10-15 seconds
```

## Cache Strategy Flow

```
┌────────────────────────────────────────┐
│  Request: /api/apple/top?country=us    │
└───────────────┬────────────────────────┘
                │
                v
        ┌───────────────┐
        │ Check Cache   │
        │ Key: us:20:all│
        └───────┬───────┘
                │
        ┌───────┴───────┐
        │               │
        v               v
    [Cache Hit]    [Cache Miss]
    Age < 1hr      Age > 1hr
        │               │
        v               v
    Return Data    Fetch from iTunes
    <50ms              2.6s
        │               │
        └───────┬───────┘
                │
                v
        ┌───────────────┐
        │  Update Cache │
        │  TTL: 1 hour  │
        └───────────────┘
```

## Error Handling Flow

```
┌────────────────────────────────────────┐
│  Batch Episodes Request (5 podcasts)   │
└───────────────┬────────────────────────┘
                │
                v
        Promise.allSettled([
            Podcast A,
            Podcast B,
            Podcast C,
            Podcast D,
            Podcast E
        ])
                │
        ┌───────┴───────────────────────────┐
        │   Each podcast independently:     │
        │                                   │
        │   Promise.race([                  │
        │       getPodcastEpisodes(),       │
        │       timeout(5000)               │
        │   ])                              │
        └───────┬───────────────────────────┘
                │
                v
        Results: [
            ✓ A: {episodes: [...], success: true},
            ✓ B: {episodes: [...], success: true},
            ✗ C: {episodes: [], success: false, error: "Timeout"},
            ✓ D: {episodes: [...], success: true},
            ✗ E: {episodes: [], success: false, error: "Feed too large"}
        ]
                │
                v
        Return Partial Results (60% success)
        User sees: A, B, D podcasts
        Gracefully handles: C, E failures
```

## Feed Size Check Flow

```
┌────────────────────────────────────┐
│  Fetch Podcast Feed                │
└───────────────┬────────────────────┘
                │
                v
        ┌───────────────┐
        │  Check size   │
        │  via headers  │
        └───────┬───────┘
                │
        ┌───────┴────────┐
        │                │
        v                v
    Size ≤ 50MB     Size > 50MB
        │                │
        v                v
    Continue         Reject
    processing       with error
        │
        v
    ┌─────────────────┐
    │  Download feed  │
    │  (stream)       │
    └────────┬────────┘
         │
         v
    ┌─────────────────┐
    │  Parse RSS      │
    │  Extract items  │
    └────────┬────────┘
         │
         v
    ┌─────────────────┐
    │  Return episodes│
    └─────────────────┘
```

## Component Hierarchy

```
DiscoverPage (Client Component)
├── EpisodeLookupProvider
│   ├── SemanticSearchBar (sticky)
│   │   └── Uses topPodcasts for search
│   │
│   ├── DailyMixCarousel
│   │   ├── heroEpisodes (5 episodes)
│   │   └── DailyMixCard × 5
│   │
│   ├── BrandShelf
│   │   ├── topPodcasts (15 podcasts)
│   │   └── BrandBubble × 15
│   │
│   └── CuriosityFeed
│       ├── feedEpisodes (15+ episodes)
│       ├── InsightCard × N
│       └── Load More (infinite scroll)
│
├── State Management
│   ├── topPodcasts [30]
│   ├── heroEpisodes [5]
│   ├── feedEpisodes [15+]
│   └── feedPage (for pagination)
│
└── Contexts
    ├── CountryContext (for country switching)
    ├── SubscriptionContext (for subscribe status)
    └── EpisodeLookupContext (for episode details)
```

## API Endpoint Architecture

```
┌────────────────────────────────────────────┐
│          Discover Page APIs                │
└────────────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        v                        v
┌────────────────┐      ┌────────────────────────┐
│ /api/apple/top │      │ /api/batch-episodes    │
├────────────────┤      ├────────────────────────┤
│ • Cache: 1hr   │      │ • Parallel processing  │
│ • Returns: 30  │      │ • Timeout: 5s/podcast  │
│ • Time: <50ms  │      │ • Returns: Partial OK  │
│   (cached)     │      │ • Time: 3-4s max       │
└────────┬───────┘      └───────┬────────────────┘
         │                      │
         v                      v
┌────────────────┐      ┌────────────────────────┐
│ getTopPodcasts │      │ getPodcastEpisodes     │
├────────────────┤      ├────────────────────────┤
│ • iTunes API   │      │ • Direct feed fetch    │
│ • RSS feed     │      │ • Or RSSHub proxy      │
│ • Cache: 6hrs  │      │ • Size check: 50MB     │
│   (in Supabase)│      │ • Cache: 1hr           │
└────────────────┘      └────────────────────────┘
```

## Key Optimizations Summary

```
┌─────────────────────────────────────────────────────────┐
│  Optimization              Before    →    After          │
├─────────────────────────────────────────────────────────┤
│  Feed Size Limit           10 MB     →    50 MB         │
│  Top Podcasts Cache        None      →    1 hour        │
│  Batch Processing          Sequential →   Parallel      │
│  Timeout Protection        None      →    5s max        │
│  Error Handling            All fail  →    Partial OK    │
│  Total Load Time           10-15s    →    2-3s          │
└─────────────────────────────────────────────────────────┘
```

## Request Flow Summary

1. **User loads page** → Skeleton appears instantly
2. **Fetch top podcasts** → Check cache first (1hr TTL)
   - Cache hit: <50ms response
   - Cache miss: 2.6s iTunes API call
3. **Parallel batch requests** → Fire simultaneously
   - Hero episodes: 5 podcasts × 1 episode each
   - Feed episodes: 5 podcasts × 3 episodes each
4. **Each podcast** → Individual timeout protection
   - Success: Return episodes
   - Timeout (5s): Return empty, don't block others
   - Error: Return empty, don't block others
5. **Render results** → Display as data arrives
   - Hero carousel populates
   - Brand shelf populates
   - Feed items populate
6. **User scrolls** → Load more batches on demand
   - Same parallel + timeout pattern
   - Progressive enhancement

## Performance Characteristics

```
┌──────────────────┬─────────┬──────────┬─────────────┐
│  Scenario        │ Before  │  After   │ Improvement │
├──────────────────┼─────────┼──────────┼─────────────┤
│  First Load      │ 10-15s  │  2-3s    │ 70-80%      │
│  Cached Load     │ 10-15s  │  1-2s    │ 80-90%      │
│  Country Switch  │ 10-15s  │  2-3s    │ 70-80%      │
│  Slow Network    │ 20-30s  │  5-7s    │ 70-80%      │
│  Error Recovery  │ Fails   │  Partial │ ✓           │
└──────────────────┴─────────┴──────────┴─────────────┘
```
