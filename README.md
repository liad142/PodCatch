# PodCatch

A modern podcast and YouTube content aggregator with AI-powered summaries.

## Features

### ✅ Feature #1: Apple Podcasts Discovery (Updated - via iTunes API + RSSHub)
- Browse podcast genres from Apple Podcasts
- Search for podcasts using iTunes Search API
- View podcast details and episodes
- Country-specific top charts (US, Israel, and 13 more countries)
- Episode fetching via RSS feeds (RSSHub or direct)
- Smart caching for API responses
- **Note:** Originally planned for Spotify, pivoted to Apple Podcasts due to Spotify API restrictions

### ✅ Feature #2: RSSHub YouTube Integration (NEW - Implemented)
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

### 🔮 Future Features
- AI-powered content summaries (Groq/Claude)
- Podcast RSS feed integration
- Unified content recommendations
- Email notifications
- Playlist management

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
│   │   │   ├── apple/        # Apple Podcasts API endpoints (NEW)
│   │   │   ├── spotify/      # Spotify API endpoints (deprecated)
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
│   │   ├── apple-podcasts.ts # Apple Podcasts client (NEW)
│   │   ├── spotify-api.ts    # Spotify API client (deprecated)
│   │   ├── spotify-db.ts     # Spotify DB operations
│   │   ├── spotify-cache.ts  # Spotify caching layer
│   │   └── supabase.ts       # Supabase client
│   ├── types/
│   │   ├── rsshub.ts         # YouTube/RSSHub types
│   │   ├── apple-podcasts.ts # Apple Podcasts types (NEW)
│   │   ├── spotify.ts        # Spotify types (deprecated)
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
- Spotify API credentials (for podcast features)

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

# Spotify (deprecated - now using Apple Podcasts)
# SPOTIFY_CLIENT_ID=your_spotify_client_id
# SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Optional: YouTube API key for better RSSHub rate limits
YOUTUBE_API_KEY=your_youtube_api_key_here

# AI APIs (for future summarization features)
GROQ_API_KEY=your_groq_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 4. Database Setup
Run migrations in Supabase SQL editor:

```bash
# In order:
1. src/db/migrations/001_spotify_schema.sql
2. src/db/migrations/002_spotify_cache_update.sql
3. src/db/migrations/003_rsshub_youtube.sql  # NEW
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

### Apple Podcasts Integration (NEW)
- `GET /api/apple/genres` - Get podcast genres
- `GET /api/apple/genres/[id]/podcasts` - Get podcasts in genre
- `GET /api/apple/top` - Get top podcasts by country
- `GET /api/apple/search` - Search podcasts
- `GET /api/apple/podcasts/[id]` - Get podcast details
- `GET /api/apple/podcasts/[id]/episodes` - Get podcast episodes (via RSS)

### Spotify Integration (Deprecated)
- `GET /api/spotify/categories` - Get podcast categories
- `GET /api/spotify/categories/[id]/shows` - Get shows in category
- `GET /api/spotify/search` - Search podcasts
- `GET /api/spotify/shows/[id]` - Get show details
- `GET /api/spotify/shows/[id]/episodes` - Get show episodes

## Database Schema

### YouTube Tables (NEW)
- `youtube_channels` - Channel metadata
- `youtube_channel_follows` - User subscriptions
- `feed_items` - Unified content storage (YouTube + future podcasts)
- `rsshub_cache` - Temporary RSS feed cache (30min TTL)

### Spotify Tables
- `spotify_shows` - Cached podcast metadata
- `spotify_episodes` - Cached episode data
- `spotify_categories` - Category information
- `category_shows` - Category-show relationships

## Development

### Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
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

### 2025-01-25 - Feature #1 Update: Apple Podcasts (Replaced Spotify)
**Changed:**
- Switched from Spotify API to iTunes Search API + RSSHub
- Reason: Spotify is no longer allowing new app creation

**Added:**
- `src/lib/apple-podcasts.ts` - iTunes API + RSSHub client
- `src/types/apple-podcasts.ts` - TypeScript types
- `src/app/api/apple/*` - API endpoints for Apple Podcasts
- `src/components/ApplePodcastCard.tsx` - Podcast card component
- `src/components/GenreCard.tsx` - Genre card with icons
- Genre-based browsing (18 Apple Podcast genres)
- Top charts by country (15 countries)
- Episode fetching via RSS feeds

**Deprecated:**
- Spotify API integration (kept for reference)

### 2025-01-XX - Feature #1: Spotify Integration (Original)
- Spotify podcast discovery
- Category browsing
- Podcast search
- Episode listing
- Caching layer for Spotify API
