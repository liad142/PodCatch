# Quick Start Guide: YouTube Feed Feature

This guide will help you test the new YouTube feed integration feature.

## Prerequisites Check

Before starting, ensure you have:
- [ ] RSSHub running (Docker or other)
- [ ] Database migrations applied (003_rsshub_youtube.sql)
- [ ] Environment variables set in `.env.local`
- [ ] Development server running (`npm run dev`)

## Step-by-Step Testing

### 1. Start RSSHub (if not already running)

```bash
# Start Docker container
docker-compose up -d

# Verify RSSHub is running
curl http://localhost:1200/

# You should see HTML response with RSSHub documentation
```

### 2. Apply Database Migration

Open Supabase SQL Editor and run:
```sql
-- Run the entire contents of:
src/db/migrations/003_rsshub_youtube.sql
```

Verify tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('youtube_channels', 'youtube_channel_follows', 'feed_items', 'rsshub_cache');
```

You should see 4 tables.

### 3. Start Development Server

```bash
npm run dev
```

Navigate to: http://localhost:3000

### 4. Test Channel Following

1. Click **"Feed"** in the header navigation
2. Click **"Manage Channels"** tab
3. Try adding a channel using any of these formats:

   **Option A - Channel URL:**
   ```
   https://youtube.com/@mkbhd
   ```

   **Option B - Channel ID:**
   ```
   UCBJycsmduvYEL83R_U4JriQ
   ```

   **Option C - Handle:**
   ```
   @mkbhd
   ```

4. Click **"Follow"** button
5. Wait for confirmation (should see channel appear in the list)

### 5. Test Feed Viewing

1. Click **"Feed"** tab
2. You should see videos from the channel you followed
3. Test feed modes:
   - Click **"Latest Items"** - shows all videos chronologically
   - Click **"Channels You Follow"** - shows only subscribed channels
4. Test filters:
   - Click **"YouTube"** badge - filters to YouTube only
   - Click **"All"** badge - shows all content types
   - Check **"Bookmarked only"** - shows only saved items (none yet)

### 6. Test Bookmark Feature

1. Find a video card in the feed
2. Click the **bookmark icon** (outline icon on bottom right of card)
3. Icon should fill in, indicating it's bookmarked
4. Enable **"Bookmarked only"** filter
5. You should now see only bookmarked videos
6. Click bookmark icon again to remove bookmark

### 7. Test Watch Feature

1. Click **"Watch"** button on any video card
2. Should open YouTube video in a new tab

### 8. Test Refresh Feature

1. Go back to **"Manage Channels"** tab
2. Click **"Refresh All"** button
3. Wait for completion (should see alert with number of videos added)
4. Go back to **"Feed"** tab
5. Should see any new videos from the channel

### 9. Test Unfollow Feature

1. In **"Manage Channels"** tab
2. Click the **trash icon** next to a channel
3. Channel should be removed from the list
4. Go to **"Feed"** tab
5. Videos from that channel should no longer appear

### 10. Test Load More

1. If you have more than 20 videos in your feed:
2. Scroll to bottom
3. Click **"Load More"** button
4. Next 20 videos should load

## Expected Behavior

### Success Indicators
✅ Channels appear in the list after following
✅ Videos appear in feed within 5-10 seconds
✅ Thumbnails load correctly
✅ Bookmarks persist across page refreshes
✅ Filters work as expected
✅ "Watch" button opens YouTube
✅ No console errors

### Common Issues

**Issue: "Failed to fetch feed"**
- Check that RSSHub is running: `docker ps`
- Check RSSHub logs: `docker-compose logs rsshub`
- Verify RSSHUB_BASE_URL in .env.local

**Issue: "Rate limit exceeded"**
- Wait 1 minute before trying again
- Rate limit: 10 requests per minute per user

**Issue: Videos not appearing**
- Check browser console for errors
- Verify userId is being sent (check Network tab)
- Check database: `SELECT * FROM feed_items;`

**Issue: Thumbnails not loading**
- YouTube thumbnail URLs should work
- Check browser console for CORS errors
- Verify thumbnail_url in database

**Issue: Bookmark not persisting**
- Check browser console for POST errors
- Verify userId matches across requests
- Check database: `SELECT * FROM feed_items WHERE bookmarked = true;`

## Testing with Multiple Channels

Recommended test channels:
1. **MKBHD** - Tech: `@mkbhd`
2. **Veritasium** - Science: `@veritasium`
3. **Kurzgesagt** - Education: `@kurzgesagt`

Follow all three, then test:
- Feed shows videos from all channels
- "Latest Items" mode mixes them chronologically
- Each channel appears in "Manage Channels"

## Database Inspection

To verify data is being stored correctly:

```sql
-- Check followed channels
SELECT * FROM youtube_channels;
SELECT * FROM youtube_channel_follows;

-- Check feed items
SELECT title, published_at, bookmarked 
FROM feed_items 
ORDER BY published_at DESC 
LIMIT 10;

-- Check cache
SELECT cache_key, expires_at 
FROM rsshub_cache 
WHERE expires_at > now();
```

## Performance Testing

1. Follow 5+ channels
2. Click "Refresh All"
3. Monitor:
   - Response time (should be < 10 seconds for 5 channels)
   - Browser console for errors
   - RSSHub logs for issues

## Edge Cases to Test

1. **Invalid channel input**: Try entering random text
   - Should show error message
2. **Already followed channel**: Follow same channel twice
   - Should handle gracefully
3. **Empty feed**: Unfollow all channels
   - Should show "No items in your feed yet" message
4. **Network issues**: Stop RSSHub container
   - Should show error message
5. **Rate limiting**: Make 11+ requests quickly
   - Should show "Rate limit exceeded" message

## Next Steps

After confirming everything works:
1. Add more channels to build a diverse feed
2. Test bookmark workflow for saving videos
3. Test feed filters extensively
4. Consider adding podcast RSS feeds (future feature)

## Reporting Issues

If you encounter bugs:
1. Check browser console for errors
2. Check RSSHub logs: `docker-compose logs rsshub`
3. Check database for unexpected state
4. Note the exact steps to reproduce
5. Save error messages and screenshots
