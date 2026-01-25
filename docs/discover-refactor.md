# Discover Page Refactor

## Overview
This document describes the refactoring of the `/browse` (Discover) page to provide a cleaner, more focused user experience with a centralized podcast grid and integrated YouTube section.

## Changes Summary

### Removed
- Multiple "Top in {Genre}" horizontal carousels below the main content
- Genre-specific carousel fetching logic
- `FEATURED_GENRE_IDS` constant and related genre carousel rendering

### Preserved (Unchanged)
- **Browse Genres carousel** at the top - exactly as before
- Hero section with title, description, country selector, and theme toggle
- Country context for localization
- Sidebar and overall layout

### Added
1. **Top Podcasts Grid Section**
   - Shows 30 podcasts initially (configurable)
   - Grid layout (6 columns on desktop, responsive)
   - "Load More" pagination
   - Country-based content

2. **YouTube Section**
   - Two tabs: Trending / Followed
   - 12 videos per page
   - Save/bookmark functionality
   - Empty states with CTAs

## Page Structure

```
/browse
├── Hero Section
│   ├── Title: "Discover"
│   ├── Country Selector
│   └── Theme Toggle
├── Browse Genres Carousel (unchanged)
├── Top Podcasts in {Country} Grid
│   ├── 30 podcast cards
│   └── Load More button
└── YouTube Section
    ├── Tab: Trending (default)
    ├── Tab: Followed
    └── 12 video cards
```

## New Components

### `PodcastGridSection`
- Location: `src/components/PodcastGridSection.tsx`
- Props:
  - `title`: Section title
  - `subtitle`: Optional subtitle
  - `podcasts`: Array of podcasts
  - `isLoading`: Loading state
  - `showLoadMore`: Show load more button
  - `onLoadMore`: Load more callback

### `YouTubeSection`
- Location: `src/components/YouTubeSection.tsx`
- Props:
  - `userId`: User ID for personalization
  - `initialTab`: 'trending' | 'followed'
  - `itemsPerPage`: Number of videos to show

### `VideoCard`
- Location: `src/components/VideoCard.tsx`
- Features:
  - Thumbnail with play overlay
  - Save/bookmark button
  - Duration badge
  - Channel name and publish date

### `EmptyState`
- Location: `src/components/EmptyState.tsx`
- Types: youtube-trending, youtube-followed, podcasts, search, saved, feed, generic

## API Endpoints Used

### Podcasts
- `GET /api/apple/genres` - Fetch genre list
- `GET /api/apple/top?country={code}&limit=30` - Top podcasts by country

### YouTube
- `GET /api/youtube/trending?limit=12` - Trending videos
- `GET /api/youtube/followed?userId={id}&limit=12` - Videos from followed channels
- `POST /api/youtube/save` - Save/unsave a video

## Genre Page Changes

### `/browse/genre/[id]`
- Now shows 30 podcasts initially
- "Load More" pagination added
- Country indicator in header
- Empty state for no results

## Data Flow

1. On page load:
   - Fetch genres (for carousel)
   - Fetch top 30 podcasts for user's country
   - Fetch trending YouTube videos
   - Fetch followed channel videos (if user has follows)

2. On country change:
   - Refetch top podcasts for new country
   - Reset pagination

3. On genre click:
   - Navigate to `/browse/genre/{id}`
   - Fetch podcasts for that genre + country

## Caching Strategy

- Apple top charts: 6-hour TTL
- Apple search results: 30-minute TTL
- YouTube trending: 30-minute TTL
- YouTube channel feeds: 30-minute TTL

## Future Improvements

1. Server-side pagination with actual offset support
2. Infinite scroll option
3. User preferences for initial tab
4. Podcast episode saves
5. Genre filters within the grid
