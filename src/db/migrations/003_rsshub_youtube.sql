-- Migration 003: RSSHub YouTube Integration Schema
-- Creates tables for YouTube channel follows and unified feed system

-- Create enum for source types (extensible for future sources)
CREATE TYPE content_source_type AS ENUM ('youtube', 'podcast');

-- YouTube channels that users follow
CREATE TABLE youtube_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL UNIQUE, -- YouTube channel ID (e.g., UCBJycsmduvYEL83R_U4JriQ)
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_handle TEXT, -- e.g., @mkbhd
  thumbnail_url TEXT,
  description TEXT,
  subscriber_count INTEGER,
  video_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User follows for YouTube channels
CREATE TABLE youtube_channel_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id UUID NOT NULL REFERENCES youtube_channels(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- Unified feed items table (supports YouTube now, podcasts later)
CREATE TABLE feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source identification
  source_type content_source_type NOT NULL,
  source_id UUID NOT NULL, -- References youtube_channels.id or podcasts.id
  
  -- Content metadata (common fields)
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER, -- Duration in seconds
  url TEXT NOT NULL, -- Link to content (YouTube video URL, podcast episode URL)
  
  -- Type-specific IDs for deduplication
  video_id TEXT, -- For YouTube (e.g., dQw4w9WgXcQ)
  episode_id TEXT, -- For podcasts (future)
  
  -- User interaction
  bookmarked BOOLEAN DEFAULT false,
  user_id UUID NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure uniqueness per user per content item
  UNIQUE(user_id, source_type, video_id),
  UNIQUE(user_id, source_type, episode_id)
);

-- RSSHub response cache (30min TTL)
CREATE TABLE rsshub_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE, -- e.g., "youtube:channel:UCBJycsmduvYEL83R_U4JriQ"
  response_data JSONB NOT NULL, -- Cached RSS feed data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_youtube_channels_channel_id ON youtube_channels(channel_id);
CREATE INDEX idx_youtube_channel_follows_user_id ON youtube_channel_follows(user_id);
CREATE INDEX idx_youtube_channel_follows_channel_id ON youtube_channel_follows(channel_id);

CREATE INDEX idx_feed_items_user_id ON feed_items(user_id);
CREATE INDEX idx_feed_items_source_type ON feed_items(source_type);
CREATE INDEX idx_feed_items_source_id ON feed_items(source_id);
CREATE INDEX idx_feed_items_published_at ON feed_items(published_at DESC);
CREATE INDEX idx_feed_items_video_id ON feed_items(video_id) WHERE video_id IS NOT NULL;
CREATE INDEX idx_feed_items_bookmarked ON feed_items(user_id, bookmarked) WHERE bookmarked = true;
CREATE INDEX idx_feed_items_user_source_published ON feed_items(user_id, source_type, published_at DESC);

CREATE INDEX idx_rsshub_cache_expires_at ON rsshub_cache(expires_at);
CREATE INDEX idx_rsshub_cache_key ON rsshub_cache(cache_key);

-- Auto-cleanup expired cache entries (optional, can be done via cron)
-- This can be called periodically by a cleanup job
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS void AS $$
BEGIN
  DELETE FROM rsshub_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE youtube_channels IS 'Stores YouTube channel metadata for all discovered channels';
COMMENT ON TABLE youtube_channel_follows IS 'User subscriptions to YouTube channels';
COMMENT ON TABLE feed_items IS 'Unified feed storage for all content types (YouTube, podcasts, etc)';
COMMENT ON TABLE rsshub_cache IS 'Temporary cache for RSSHub API responses (30min TTL)';
COMMENT ON COLUMN feed_items.source_type IS 'Type of content: youtube or podcast';
COMMENT ON COLUMN feed_items.video_id IS 'YouTube video ID for deduplication';
COMMENT ON COLUMN feed_items.episode_id IS 'Podcast episode ID for deduplication';
