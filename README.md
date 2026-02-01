# PodCatch

A modern podcast and YouTube content aggregator with AI-powered summaries.

## Features

### ✅ Feature #1: Apple Podcasts Discovery (via iTunes API + RSSHub)
- Browse podcast genres from Apple Podcasts
- Search for podcasts using iTunes Search API
- View podcast details and episodes
- Country-specific top charts (US, Israel, and 13 more countries)
- Episode fetching via RSS feeds (RSSHub or direct)
- Smart caching for API responses

### ✅ Feature #2: RSSHub YouTube Integration
- **Follow YouTube Channels**: Add channels by URL, channel ID, or @handle
- **Unified Feed**: View content from all followed channels in one place
- **Feed Modes**:
  - Latest Items: Chronological feed across all sources
  - Channels You Follow: Filter by subscriptions only
  - Mixed: (Coming soon) Recommendations + subscriptions
- **Content Filters**: Filter by YouTube, Podcasts, or All (Podcasts coming soon)
- **Bookmarks**: Save videos for later viewing
- **Refresh**: Force refresh all followed channels for latest content
- **RSSHub Integration**: Self-hosted RSS feed generation for YouTube channels
- **Smart Caching**: 30-minute cache for RSS feeds to reduce load
- **Rate Limiting**: 10 requests/minute per user for channel operations

### ✅ Feature #3: Modern Sidebar Navigation
- **Persistent Navigation**: Collapsible sidebar with icons and labels
- **Quick Access**: Navigate to Discover, My Podcasts, Feed, Episode Summaries, Smart Notes, Saved, and Settings
- **Responsive**: Adapts to mobile (bottom bar) and desktop (side drawer)
- **User Profile**: Displays current user info with avatar

### ✅ Feature #4: Multi-Level AI Summaries
- **Quick Summary**: Fast, concise overview perfect for deciding whether to listen
  - TLDR (2 sentences max)
  - Key takeaways (5-7 bullets)
  - Target audience (who should listen)
  - Topic tags
- **Deep Summary**: Comprehensive analysis for engaged listeners
  - Structured sections with key points
  - Mentioned resources (tools, links, people, papers)
  - Actionable next steps
  - Rich topic taxonomy
- **Smart Processing**:
  - Automatic transcription via Groq (Whisper Large v3)
  - AI summarization via Claude 3.5 Haiku
  - Status tracking (queued → transcribing → summarizing → ready)
  - Global caching (summaries shared across all users)
- **Dual Import Sources**:
  - Import from Apple Podcasts (via browse)
  - Import from YouTube channels (coming soon)

### ✅ Feature #5: Insights Hub (Advanced Analysis)
- **Multiple Analysis Views**:
  - **Summary Tab**: Quick and Deep summaries in one place
  - **Transcript Tab**: Full episode transcript with timestamps
  - **Keywords Tab**: Top keywords with frequency counts
  - **Highlights Tab**: Key moments and quotes
  - **Mind Map Tab**: Visual concept relationships (Mermaid diagram)
  - **Show Notes Tab**: Generated episode notes
- **Sticky Navigation**: Tab bar stays visible while scrolling
- **Smart Generation**: Each insight type generated on-demand
- **Status Indicators**: Visual feedback for generation progress

### 🎯 Global Database Caching
- **One Summary Per Episode**: When one user generates a summary, all users benefit
- **Instant Access**: "Summary Ready" badges show pre-existing summaries
- **Smart Deduplication**: Episodes matched by audio URL across all import sources
- **Cost Efficient**: Reduces API calls to Claude and Groq by sharing results

### 🔮 Future Features
- Chat with episode (Q&A on transcript)
- Personalized recommendations
- Email notifications for new content
- Playlist management
- Multi-language support

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **External Services**:
  - iTunes Search API (podcast discovery)
  - RSSHub (YouTube RSS + Apple Podcasts feeds)
  - Groq API (AI transcription)
  - Anthropic Claude API (AI summaries)
- **Testing**: Vitest, React Testing Library
- **TypeScript**: Strict mode enabled

## Project Structure

```
PodCatch/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── feed/         # Unified feed endpoints
│   │   │   ├── youtube/      # YouTube channel management
│   │   │   ├── apple/        # Apple Podcasts API endpoints
│   │   │   ├── podcasts/     # Podcast endpoints
│   │   │   └── episodes/     # Episode endpoints
│   │   ├── browse/           # Discovery pages
│   │   ├── feed/             # Unified feed page (NEW)
│   │   ├── episode/          # Episode detail pages
│   │   └── podcast/          # Podcast detail pages
│   ├── components/
│   │   ├── ui/               # Shadcn UI components
│   │   ├── FeedScreen.tsx    # Main feed interface (NEW)
│   │   ├── FeedItemCard.tsx  # Universal content card (NEW)
│   │   ├── YouTubeChannelManager.tsx  # Channel follow/unfollow UI (NEW)
│   │   └── ...               # Other components
│   ├── lib/
│   │   ├── rsshub.ts         # RSSHub client & rate limiting
│   │   ├── rsshub-db.ts      # YouTube DB operations
│   │   ├── apple-podcasts.ts # Apple Podcasts client
│   │   └── supabase.ts       # Supabase client
│   ├── types/
│   │   ├── rsshub.ts         # YouTube/RSSHub types
│   │   ├── apple-podcasts.ts # Apple Podcasts types
│   │   └── database.ts       # Database types
│   └── db/
│       └── migrations/
│           ├── 001_spotify_schema.sql
│           ├── 002_spotify_cache_update.sql
│           └── 003_rsshub_youtube.sql  # YouTube tables (NEW)
├── docs/
│   ├── assumptions.md        # Product & technical decisions (NEW)
│   ├── rsshub-setup.md       # RSSHub deployment guide (NEW)
│   ├── testing-setup.md
│   └── manual-test-checklist.md
├── docker-compose.yml        # RSSHub self-hosting (NEW)
└── .env.local.example
```

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ and npm
- Supabase account (or local Supabase setup)
- Docker (for self-hosted RSSHub - recommended)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# RSSHub (for YouTube and Apple Podcasts RSS feeds)
RSSHUB_BASE_URL=http://localhost:1200

# Optional: YouTube API key for better RSSHub rate limits
YOUTUBE_API_KEY=your_youtube_api_key_here

# AI APIs (for future summarization features)
GROQ_API_KEY=your_groq_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 4. Database Setup
Run migrations in Supabase SQL editor in order:

```bash
1. src/db/migrations/001_spotify_schema.sql      # Base schema (legacy)
2. src/db/migrations/002_spotify_cache_update.sql # Cache updates (legacy)
3. src/db/migrations/003_rsshub_youtube.sql      # YouTube integration
4. src/db/migrations/004_multi_level_summaries.sql # AI summaries
5. src/db/migrations/005_insights_level.sql      # Insights hub
```

### 5. Start RSSHub (Self-Hosted - Recommended)
```bash
# Start RSSHub with Docker
docker-compose up -d

# Verify it's running
curl http://localhost:1200/
```

See `docs/rsshub-setup.md` for detailed setup instructions, production deployment, and Redis caching.

### 6. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Build for Production
```bash
npm run build
npm start
```

## Usage

### YouTube Feed Feature

1. **Navigate to Feed**: Click "Feed" in the header navigation
2. **Manage Channels Tab**: 
   - Add channels by pasting:
     - Channel URL: `https://youtube.com/@mkbhd`
     - Channel ID: `UCBJycsmduvYEL83R_U4JriQ`
     - Handle: `@mkbhd`
   - View all followed channels
   - Unfollow channels
   - Refresh all channels for latest videos
3. **Feed Tab**:
   - Switch feed modes (Latest Items / Channels You Follow)
   - Filter by content type (YouTube / Podcasts / All)
   - Toggle "Bookmarked only" filter
   - Click "Watch" to open videos on YouTube
   - Click bookmark icon to save videos
   - Infinite scroll with "Load More" button

### Podcast Discovery (Apple Podcasts)

1. **Browse Genres**: Visit `/browse` to explore podcast genres
2. **Top Charts**: See top podcasts by country (US, IL, UK, etc.)
3. **Search**: Use the search bar to find specific podcasts
4. **View Details**: Click on a podcast to see episodes and details
5. **Listen**: Open podcasts in Apple Podcasts or access RSS feed directly

## API Endpoints

### YouTube Management
- `POST /api/youtube/channels/follow` - Follow a YouTube channel
- `DELETE /api/youtube/channels/[id]/unfollow` - Unfollow a channel
- `GET /api/youtube/channels` - List followed channels
- `POST /api/youtube/refresh` - Refresh all followed channels

### Unified Feed
- `GET /api/feed` - Get unified feed with filters
  - Query params: `userId`, `sourceType`, `mode`, `bookmarked`, `limit`, `offset`
- `POST /api/feed/[id]/bookmark` - Toggle bookmark on item

### Apple Podcasts Integration
- `GET /api/apple/genres` - Get podcast genres
- `GET /api/apple/genres/[id]/podcasts` - Get podcasts in genre
- `GET /api/apple/top` - Get top podcasts by country
- `GET /api/apple/search` - Search podcasts
- `GET /api/apple/podcasts/[id]` - Get podcast details
- `GET /api/apple/podcasts/[id]/episodes` - Get podcast episodes (via RSS)

### Episode Import & Summaries
- `POST /api/episodes/import` - Import episode from external source (Apple, YouTube)
- `GET /api/episodes/[id]/summaries` - Get all summaries for an episode
- `POST /api/episodes/[id]/summaries` - Request summary generation (quick/deep)
- `POST /api/summaries/check` - Batch check summary availability by audio URLs

### Insights Generation
- `POST /api/episodes/[id]/insights` - Generate specific insight type
  - Body: `{ type: 'keywords' | 'highlights' | 'mindmap' | 'shownotes' }`
- `GET /api/episodes/[id]/insights` - Get all insights for an episode

## Database Schema

### Core Tables
- `podcasts` - Podcast metadata (global)
- `episodes` - Episode metadata (global, deduplicated by audio_url)
- `transcripts` - Audio transcriptions (global, shared across summaries)
- `summaries` - Multi-level summaries (quick/deep/insights, global)
  - Unique constraint: (episode_id, level, language)
  - Status tracking: not_ready → queued → transcribing → summarizing → ready/failed

### YouTube Tables
- `youtube_channels` - Channel metadata
- `youtube_channel_follows` - User subscriptions
- `feed_items` - Unified content storage (YouTube + future podcasts)
- `rsshub_cache` - Temporary RSS feed cache (30min TTL)

## Development

### Testing
```bash
# Run tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run tests with coverage
npx vitest run --coverage
```

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

## Architecture Decisions

See `docs/assumptions.md` for detailed product and technical decisions including:
- Feed modes and filtering strategy
- Caching strategy (30min TTL)
- Rate limiting (10 req/min per user)
- Self-hosted RSSHub rationale
- Unified data model for multi-source content

## Troubleshooting

### RSSHub Issues
- **Not responding**: Check `docker ps` and `docker-compose logs rsshub`
- **Rate limits**: Add YouTube API key to docker-compose.yml
- **Memory issues**: Adjust container memory limits

### Build Errors
- Ensure all environment variables are set
- Check Supabase connection
- Verify migrations are applied

### Feed Not Loading
- Verify user is following channels
- Check browser console for errors
- Ensure RSSHub is running and accessible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

ISC

## Changelog

### 2026-01-27 - Features #4 & #5: AI Summaries + Insights Hub + Global Caching
**Added:**
- Multi-level AI summaries (Quick & Deep) with Claude 3.5 Haiku
- Automatic transcription via Groq (Whisper Large v3)
- Insights Hub with 6 analysis views (Summary, Transcript, Keywords, Highlights, Mind Map, Show Notes)
- Global database caching - one summary per episode shared across all users
- Smart episode import with audio URL deduplication
- Summary status tracking (queued → transcribing → summarizing → ready/failed)
- "Summary Ready" badges for episodes with existing summaries
- Batch summary availability checking API

**Components:**
- `SummaryPanel.tsx` - Quick/Deep summary display with request UI
- `InsightHub.tsx` - Tabbed interface for all insights
- `StickyTabNav.tsx` - Persistent tab navigation
- `insights/KeywordsView.tsx` - Keyword frequency analysis
- `insights/HighlightsView.tsx` - Key moments and quotes
- `insights/MindMapView.tsx` - Visual concept map (Mermaid)
- `insights/ShowNotesView.tsx` - Generated episode notes
- `insights/TranscriptView.tsx` - Full transcript display

**Backend:**
- `src/lib/summary-service.ts` - Summary orchestration & transcript management
- `src/lib/insights-service.ts` - Insights generation (keywords, highlights, etc.)
- `src/lib/groq.ts` - Groq API client for transcription
- `src/app/api/episodes/import/route.ts` - Episode import with deduplication
- `src/app/api/summaries/check/route.ts` - Batch availability checker
- `src/app/api/episodes/[id]/summaries/route.ts` - Summary generation
- `src/app/api/episodes/[id]/insights/route.ts` - Insights generation

**Database:**
- `004_multi_level_summaries.sql` - Summaries & transcripts schema
- `005_insights_level.sql` - Insights level support
- New tables: `transcripts`, `summaries` (with level: quick/deep/insights)

**Pages:**
- `/episode/[id]` - Episode detail with summary panel
- `/episode/[id]/insights` - Full-page insights hub

**Documentation:**
- `docs/summaries-levels.md` - Multi-level summary architecture
- Updated `docs/assumptions.md` with Feature #4 decisions

### 2025-01-25 - Feature #3: Discover Page Refactor + YouTube Section
**Changed:**
- Removed multiple "Top in {Genre}" horizontal carousels from Discover page
- Replaced with single "Top Podcasts in {Country}" grid section (30 items)
- Added YouTube section with Trending/Followed tabs to Discover page
- Updated Genre page with "Load More" pagination
- Implemented Saved page with YouTube video saves

**Added Components:**
- `PodcastGridSection.tsx` - Reusable podcast grid with loading/pagination
- `YouTubeSection.tsx` - YouTube section with Trending/Followed tabs
- `VideoCard.tsx` - YouTube video card with save functionality
- `EmptyState.tsx` - Configurable empty state component

**Added API Endpoints:**
- `GET /api/youtube/trending` - Trending YouTube videos via RSSHub
- `GET /api/youtube/followed` - Videos from followed channels
- `POST /api/youtube/save` - Save/unsave YouTube videos
- `GET /api/youtube/save` - Get saved YouTube videos

**Updated:**
- Apple Podcasts cache TTL increased to 6 hours for top charts
- Genre page now has pagination with "Load More" button
- Saved page now shows saved YouTube videos

**Documentation:**
- `docs/discover-refactor.md` - New page structure and removed sections
- `docs/youtube-rsshub.md` - YouTube integration via RSSHub
- `docs/assumptions.md` - Updated with Feature #3 decisions

### 2025-01-25 - Feature #2: RSSHub YouTube Integration
**Added:**
- YouTube channel follow/unfollow system
- Unified feed interface with multiple view modes
- RSSHub integration for YouTube RSS feeds
- Smart caching (30min TTL) and rate limiting (10 req/min)
- Bookmark system for saving videos
- Feed filtering (source type, bookmarked, mode)
- Self-hosted RSSHub setup with Docker
- Database migration for YouTube schema
- API endpoints for YouTube and feed management
- TypeScript types for RSSHub integration
- Comprehensive documentation

**Components:**
- `FeedScreen.tsx` - Main feed with filters
- `FeedItemCard.tsx` - Universal content card
- `YouTubeChannelManager.tsx` - Channel management UI

**Backend:**
- `src/lib/rsshub.ts` - RSSHub client library
- `src/lib/rsshub-db.ts` - Database operations
- `src/app/api/youtube/*` - YouTube endpoints
- `src/app/api/feed/*` - Feed endpoints

**Database:**
- `003_rsshub_youtube.sql` - Schema for YouTube integration

### 2025-01-25 - Feature #1: Apple Podcasts Discovery
**Added:**
- `src/lib/apple-podcasts.ts` - iTunes API + RSSHub client
- `src/types/apple-podcasts.ts` - TypeScript types
- `src/app/api/apple/*` - API endpoints for Apple Podcasts
- `src/components/ApplePodcastCard.tsx` - Podcast card component
- `src/components/GenreCard.tsx` - Genre card with icons
- Genre-based browsing (18 Apple Podcast genres)
- Top charts by country (15 countries)
- Episode fetching via RSS feeds

### 2026-02-01 - Sticky Audio Player ("Mini Player")
**Added:**
- `StickyAudioPlayer.tsx` - Spotify-style glassmorphic audio player fixed at bottom of viewport
- `AudioPlayerContext.tsx` - Global audio state management (play/pause/seek/volume/playbackRate)
- `PlayButton.tsx` - Reusable play button component with multiple variants (primary, outline, ghost, overlay)
- `slider.tsx` - Custom Shadcn-style slider component for progress & volume
- Installed `react-use` dependency for audio hook utilities

**Features:**
- Glassmorphic design with `bg-black/90 backdrop-blur-xl` and violet/purple gradient accents
- Responsive layout: adapts to desktop sidebar offset and mobile viewports
- Glowing progress bar with interactive seek functionality
- Playback controls: Skip -15s, Play/Pause, Skip +15s
- Playback speed toggle (0.5x to 2x)
- Volume slider with mute toggle (desktop only)
- Expandable panel for detailed controls on mobile
- Playing indicator animation on album art
- Persists across all pages (Discovery Feed, etc.)

**Integration:**
- Updated `layout.tsx` with AudioPlayerProvider wrapper
- Added `pb-24` padding to main content to prevent player overlap
- Integrated `PlayButton` into `InsightCard.tsx` (hover overlay + action button)
- Replaced native audio links in all podcast/episode pages

**Documentation:**
- `docs/sticky-audio-player.md` - Full audio player implementation guide
- `docs/ai-prompts-reference.md` - All AI prompts used in summarization system

### 2026-01-31 - Codebase Cleanup
**Removed:**
- All deprecated Spotify integration code (API routes, libraries, types, components)
- Unused MSW mock handlers
- Stale documentation and completed plans
