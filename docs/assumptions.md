# Assumptions for Feature #2: RSSHub YouTube Integration

## Product Decisions
- **YouTube is primary source**: Full implementation for MVP
- **Podcasts placeholder**: UI includes toggles but backend can be added later
- **No AI summaries yet**: Cards show raw metadata only (title, description, thumbnail)
- **Bookmark system**: Simple boolean flag, no folders/tags
- **Channel input methods**: Support URL, channel ID, and @handle
- **Feed modes**:
  1. Channels You Follow (subscribed only)
  2. Latest Items (chronological across all followed)
  3. Mixed (future: add recommendations)

## Technical Decisions
- **RSSHub deployment**: Self-hosted via Docker recommended
  - Env var: `RSSHUB_BASE_URL` (default: http://localhost:1200)
  - Fallback to public instance allowed but with warning
- **Caching strategy**: 
  - Cache RSSHub responses for 30 minutes
  - Store feed items in DB permanently
  - Dedupe by `video_id` (YouTube) or `episode_id` (future)
- **Rate limiting**: 
  - Max 10 requests/minute to RSSHub per user
  - Implement simple in-memory rate limiter
- **Pagination**: 
  - Load 20 items per page initially
  - Infinite scroll on frontend
- **Data model**:
  - `source_type` enum: 'youtube' | 'podcast'
  - Unified `feed_items` table for all content types
  - Separate `youtube_channels` table for followed channels

## API Endpoints (Backend)
- `POST /api/youtube/channels/follow` - Add channel by URL/ID/@handle
- `DELETE /api/youtube/channels/:id/unfollow` - Remove channel
- `GET /api/youtube/channels` - List followed channels
- `GET /api/feed` - Unified feed with filters (source_type, mode)
- `POST /api/feed/:id/bookmark` - Toggle bookmark
- `GET /api/youtube/refresh` - Force refresh all followed channels

## UI Components
- `FeedScreen.tsx` - Main unified feed with mode switcher
- `YouTubeChannelManager.tsx` - Follow/unfollow UI
- `FeedItemCard.tsx` - Universal card (adapts to source_type)
- `FilterBar.tsx` - Source type toggles (YouTube/Podcasts/All)

## Dependencies to Add
- Backend: `rss-parser` for parsing RSS feeds from RSSHub
- Backend: `node-cache` for in-memory caching
- Frontend: React Query for feed state management (optional, can use fetch)

## Out of Scope (MVP)
- AI summarization (comes later)
- Recommendations algorithm
- Playlist creation
- Video playback in-app (just link to YouTube)
- Email notifications
- RSS feed export
- Advanced search/filters

---

# Assumptions for Feature #3: Discover Page Refactor + YouTube Section

## Product Decisions (January 2025)

### Discover Page Refactor
- **Genre carousel preserved**: The "Browse Genres" horizontal carousel remains exactly as-is at the top
- **Removed genre carousels**: All "Top in {Genre}" carousels below the main content have been removed
- **Single podcast grid**: One centralized "Top Podcasts in {Country}" grid replaces multiple carousels
- **Grid layout**: Pocket Casts-inspired grid design, not Spotify-style horizontal lists
- **Initial count**: 30 podcasts shown initially, with "Load More" pagination
- **No infinite scroll**: Explicit pagination chosen over infinite scroll for better UX control

### YouTube Section on Discover
- **Two tabs**: Trending and Followed
- **Trending source**: RSSHub `/youtube/trending/{country}` endpoint
- **Fallback channels**: If trending unavailable, popular tech/educational channels used
- **12 items default**: Shows 12 videos per tab initially
- **Save functionality**: Users can save videos to their Saved page

### Genre Page
- **Pagination added**: "Load More" button for loading more podcasts
- **Country indicator**: Shows current country in header
- **30 initial items**: Same as main Discover grid

### Saved Page
- **Two tabs**: YouTube and Podcasts (podcasts coming soon)
- **Real-time updates**: Unsaving a video removes it from the list immediately
- **Uses feed_items.bookmarked**: No new table needed

## Technical Decisions

### API Endpoints Added
- `GET /api/youtube/trending` - Trending videos via RSSHub
- `GET /api/youtube/followed` - Videos from followed channels
- `POST /api/youtube/save` - Save/unsave video
- `GET /api/youtube/save` - Get saved videos

### Caching Updates
- **Apple top charts**: 6-hour TTL (increased from 1 hour)
- **Apple search**: 30-minute TTL
- **YouTube trending**: 30-minute TTL
- **YouTube channels**: 30-minute TTL (unchanged)

### Component Architecture
- `PodcastGridSection` - Reusable grid for podcasts with loading states
- `YouTubeSection` - Self-contained YouTube section with tabs
- `VideoCard` - YouTube video card with save button
- `EmptyState` - Configurable empty state component

### Error Handling
- **Graceful degradation**: If RSSHub fails, return empty with message, don't crash
- **Cache fallback**: Return expired cache data if fresh fetch fails
- **User feedback**: Clear error messages and retry buttons

## UI/UX Decisions
- **Theme compatibility**: All components work in both light and dark mode
- **Responsive grid**: 2 columns mobile → 6 columns desktop
- **Loading skeletons**: Proper loading states match actual card dimensions
- **Play overlay**: Hover effect on video thumbnails shows play button

## Authentication Assumptions
- **Demo user**: Using `demo-user-id` placeholder until auth is implemented
- **No OAuth**: YouTube subscription import not available (would require Google OAuth)
- **Manual follows only**: Users must manually add channels

## Out of Scope
- YouTube OAuth integration for subscription import
- Podcast episode saves (future feature)
- Server-side pagination with real offsets
- Infinite scroll
- Video playback in-app
