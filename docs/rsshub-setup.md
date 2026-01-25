# RSSHub Self-Hosting Setup

## Overview
RSSHub is the backend service that converts YouTube channels to RSS feeds. For production stability and avoiding rate limits, we recommend self-hosting.

## Quick Start (Docker)

### 1. Create docker-compose.yml in project root:

```yaml
version: '3.8'

services:
  rsshub:
    image: diygod/rsshub:latest
    container_name: rsshub
    restart: always
    ports:
      - "1200:1200"
    environment:
      NODE_ENV: production
      CACHE_TYPE: memory
      CACHE_EXPIRE: 1800
      # YouTube API key (optional but recommended for better rate limits)
      YOUTUBE_KEY: ${YOUTUBE_API_KEY}
      # Disable access control for local use
      ACCESS_KEY: ""
    volumes:
      - rsshub-data:/app/data

volumes:
  rsshub-data:
```

### 2. Start RSSHub:

```bash
docker-compose up -d
```

### 3. Verify it's running:

```bash
curl http://localhost:1200/
# Should return RSSHub documentation page
```

### 4. Test YouTube endpoint:

```bash
# Example: Get videos from a channel
curl http://localhost:1200/youtube/user/@mkbhd
```

## Configuration in PodCatch

Add to `.env.local`:

```env
# RSSHub Configuration
RSSHUB_BASE_URL=http://localhost:1200

# Optional: YouTube API key for better rate limits in RSSHub
YOUTUBE_API_KEY=your_youtube_api_key_here
```

## Using Public RSSHub Instance (Not Recommended)

If you cannot self-host, you can use the public instance:

```env
RSSHUB_BASE_URL=https://rsshub.app
```

**Warnings:**
- Public instance has strict rate limits
- May be unreliable during peak hours
- Your requests are visible to RSSHub operators
- May be blocked in some regions

## YouTube Channel URL Formats

RSSHub supports multiple YouTube URL formats:

1. **Channel ID**: `/youtube/channel/:channelId`
   - Example: `/youtube/channel/UCBJycsmduvYEL83R_U4JriQ` (MKBHD)

2. **Username/Handle**: `/youtube/user/:username`
   - Example: `/youtube/user/@mkbhd`

3. **Legacy username**: `/youtube/user/:legacyUsername`
   - Example: `/youtube/user/marquesbrownlee`

## Monitoring

Check RSSHub logs:
```bash
docker-compose logs -f rsshub
```

Check container status:
```bash
docker-compose ps
```

## Troubleshooting

### RSSHub not responding
1. Check if container is running: `docker ps`
2. Check logs: `docker-compose logs rsshub`
3. Restart: `docker-compose restart rsshub`

### Rate limit errors
1. Add YouTube API key to docker-compose.yml
2. Increase cache expiration time
3. Reduce polling frequency in app

### Memory issues
Update docker-compose.yml:
```yaml
services:
  rsshub:
    # ... other config
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## Production Deployment

For production, consider:
1. **Redis cache** instead of memory (survives restarts)
2. **Reverse proxy** (nginx) with SSL
3. **Access key** to prevent abuse
4. **Monitoring** (Prometheus/Grafana)

Example with Redis:
```yaml
services:
  rsshub:
    environment:
      CACHE_TYPE: redis
      REDIS_URL: redis://redis:6379/
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    restart: always
    volumes:
      - redis-data:/data

volumes:
  rsshub-data:
  redis-data:
```
