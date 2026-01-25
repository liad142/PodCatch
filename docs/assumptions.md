# Feature #1: Spotify-based Podcast Discovery - Assumptions

## API & Authentication
1. **Spotify API Credentials**: We assume a Spotify Web API app will be created with Client ID and Client Secret. These will be stored as `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in environment variables.
2. **Spotify Client Credentials Flow**: For MVP, we use the Client Credentials OAuth flow (no user authentication required). This allows access to public podcast data without user login.
3. **Rate Limiting**: Spotify API has rate limits. We'll implement exponential backoff retry logic and respect `Retry-After` headers.

## Markets & Regions
4. **MVP Markets**: Israel (IL) and United States (US) only.
5. **Default Market**: US is the default/fallback market when IL has missing content or when user location is unknown.
6. **User Country Detection**: We auto-detect via `navigator.language` / `Accept-Language` header, with manual override in settings (stored in localStorage for MVP, Supabase user preferences later).

## Caching Strategy
7. **Cache TTL**: 6 hours default for categories and top podcasts. Configurable via `CACHE_TTL_HOURS` env variable.
8. **Database Caching**: All Spotify responses are cached in Supabase tables to reduce API calls and improve performance.
9. **Cache Key Structure**: `{endpoint}:{market}:{params_hash}` pattern for cache lookup.

## UI/UX Decisions
10. **Carousel Item Count**: 12 items visible per carousel section, horizontally scrollable.
11. **Grid Layout**: Show pages use responsive grid (2 cols mobile, 3 tablet, 4 desktop).
12. **Episode Pagination**: Initial load of 20 episodes, then load more on scroll (infinite scroll).
13. **Spotify Show vs RSS**: Spotify discovery creates references to shows. User can optionally add show's RSS feed later for full integration.

## Data Model Decisions
14. **Separate Tables**: Spotify-sourced data is stored in separate tables (`spotify_*`) from user-added RSS podcasts to maintain data integrity.
15. **Show ID Mapping**: Spotify show IDs are stored and used as primary reference. RSS feed URL is optional metadata.
16. **No Episode Audio**: Spotify API doesn't provide direct audio URLs. Episodes are metadata-only; playback happens via Spotify client redirect.

## Search
17. **Unified Search**: Search bar searches both Spotify catalog and local RSS podcasts.
18. **Market-aware Search**: All searches include user's market for localized results.
19. **Search Debounce**: 300ms debounce on search input.

## Categories
20. **Spotify Categories**: We use Spotify's podcast categories endpoint. Not all general Spotify categories have podcasts; we filter to podcast-relevant ones.
21. **Category Icons**: We'll use category images from Spotify API or fallback to generated icons.

## Future Considerations (Not in MVP)
- Spotify OAuth for user's followed/liked shows import
- User accounts and saved preferences in Supabase
- Push notifications for new episodes
- Podcast episode streaming via Spotify SDK

## Technical Stack
- **Frontend**: Next.js 16 App Router, Tailwind CSS 4, React 19
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase (PostgreSQL)
- **Caching Layer**: Supabase tables with TTL-based invalidation
