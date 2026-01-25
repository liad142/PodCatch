# YouTube Integration via RSSHub

## Overview
PodCatch uses RSSHub to fetch YouTube content without requiring YouTube API quotas. This document explains the integration architecture, endpoints, and configuration.

## Environment Variables

```env
# Required
RSSHUB_BASE_URL=http://localhost:1200  # Self-hosted RSSHub instance

# Optional (improves rate limits in RSSHub)
YOUTUBE_API_KEY=your_youtube_api_key
```

## RSSHub Setup

### Self-Hosted (Recommended)
See `docs/rsshub-setup.md` for Docker setup instructions.

```bash
docker-compose up -d rsshub
```

### Public Instance (Not Recommended)
```env
RSSHUB_BASE_URL=https://rsshub.app
```
Warning: Public instance has strict rate limits and may be unreliable.

## API Endpoints

### GET /api/youtube/trending
Fetches trending/popular YouTube videos.

**Parameters:**
- `limit` (optional): Number of videos (default: 12)
- `country` (optional): Country code (default: US)

**Response:**
```json
{
  "success": true,
  "videos": [
    {
      "videoId": "abc123",
      "title": "Video Title",
      "description": "Video description",
      "thumbnailUrl": "https://img.youtube.com/vi/abc123/hqdefault.jpg",
      "publishedAt": "2025-01-25T00:00:00Z",
      "channelName": "Channel Name",
      "channelUrl": "https://youtube.com/@channel",
      "url": "https://youtube.com/watch?v=abc123"
    }
  ],
  "count": 12,
  "source": "cache" | "fresh"
}
```

**RSSHub Route Used:** `/youtube/trending/{country}`

**Fallback:** If trending unavailable, fetches from popular channels:
- @TED, @TEDxTalks, @veritasium, @vsauce, @mkbhd, @LinusTechTips

### GET /api/youtube/followed
Fetches videos from user's followed channels.

**Parameters:**
- `userId` (required): User ID
- `limit` (optional): Number of videos (default: 12)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "videos": [...],
  "count": 12,
  "hasMore": true
}
```

### POST /api/youtube/channels/follow
Follow a YouTube channel.

**Request Body:**
```json
{
  "input": "@mkbhd",  // URL, channel ID, or @handle
  "userId": "user-id"
}
```

**RSSHub Routes Used:**
- `/youtube/channel/{channelId}` - For channel IDs (UC...)
- `/youtube/user/{handle}` - For @handles

### POST /api/youtube/save
Save/unsave a YouTube video.

**Request Body:**
```json
{
  "userId": "user-id",
  "videoId": "abc123",
  "title": "Video Title",
  "description": "Description",
  "thumbnailUrl": "https://...",
  "publishedAt": "2025-01-25T00:00:00Z",
  "url": "https://youtube.com/watch?v=abc123",
  "action": "toggle" | "save" | "unsave"
}
```

### GET /api/youtube/save
Get saved videos for a user.

**Parameters:**
- `userId` (required): User ID
- `limit` (optional): Number of videos (default: 50)
- `offset` (optional): Pagination offset (default: 0)

## How "Followed" Works

### Manual Channel Follow
1. User enters channel URL, ID, or @handle
2. App parses input to determine type (channel ID vs handle)
3. Fetches channel feed from RSSHub
4. Stores channel info in `youtube_channels` table
5. Creates follow relationship in `youtube_channel_follows`
6. Stores recent videos in `feed_items` table

### Supported Input Formats
- Channel URL: `https://youtube.com/channel/UCxxxxxxx`
- Handle URL: `https://youtube.com/@mkbhd`
- Raw handle: `@mkbhd` or `mkbhd`
- Channel ID: `UCBJycsmduvYEL83R_U4JriQ`

### Import Subscriptions (Future)
YouTube OAuth integration is not currently implemented. Users must manually add channels.

**Limitation:** Manual channel addition only. Bulk import requires:
1. YouTube Data API OAuth consent
2. `youtube.readonly` scope
3. Subscriptions list API call
4. Storage of imported channels

## Caching Strategy

### Cache Table
Uses `rsshub_cache` table for all cached responses.

### TTL by Content Type
| Content | TTL | Rationale |
|---------|-----|-----------|
| Trending videos | 30 min | Changes frequently |
| Channel feed | 30 min | New uploads |
| Channel metadata | 24 hours | Rarely changes |

### Cache Key Format
- `youtube:trending:{country}:{limit}`
- `youtube:{channelIdOrHandle}`

### Fallback Behavior
If RSSHub is down:
1. Return cached data if available (even if expired)
2. If no cache, return empty array with friendly message
3. Never crash the API

## Database Schema

### youtube_channels
```sql
id UUID PRIMARY KEY
channel_id TEXT UNIQUE     -- YouTube channel ID
channel_name TEXT
channel_url TEXT
channel_handle TEXT        -- @handle
thumbnail_url TEXT
description TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### youtube_channel_follows
```sql
id UUID PRIMARY KEY
user_id UUID
channel_id UUID REFERENCES youtube_channels(id)
followed_at TIMESTAMP
UNIQUE(user_id, channel_id)
```

### feed_items (used for saved videos)
```sql
id UUID PRIMARY KEY
source_type 'youtube' | 'podcast'
source_id UUID
video_id TEXT              -- YouTube video ID
title TEXT
description TEXT
thumbnail_url TEXT
published_at TIMESTAMP
url TEXT
bookmarked BOOLEAN         -- Save status
user_id UUID
UNIQUE(user_id, source_type, video_id)
```

## Error Handling

### RSSHub Errors
- Rate limited: Return cached data or empty with message
- Network error: Same fallback behavior
- Invalid channel: Return 400 with descriptive error

### User Errors
- Invalid channel URL: Parse error with example formats
- Already following: Ignore duplicate, return success

## Rate Limiting

### In-Memory Rate Limiter
- 10 requests per minute per user for channel follows
- 5 requests per minute for refresh all

### RSSHub Rate Limiting
- Self-hosted: Configure in RSSHub docker environment
- Add YouTube API key for higher limits

## Monitoring

### Logs to Watch
- `RSSHub fetch error` - RSSHub connectivity issues
- `Cache write error` - Database issues
- `Rate limit exceeded` - User hitting limits

### Health Checks
- RSSHub: `GET {RSSHUB_BASE_URL}/`
- Trending endpoint: `GET /api/youtube/trending?limit=1`
