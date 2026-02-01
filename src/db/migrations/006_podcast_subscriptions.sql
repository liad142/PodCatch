-- Migration: 006_podcast_subscriptions.sql
-- Purpose: Create junction table for user podcast subscriptions
-- This decouples "subscribing to a podcast" from "having podcast metadata for episodes"

-- Create the subscriptions table
CREATE TABLE IF NOT EXISTS podcast_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, podcast_id)
);

-- Add index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_podcast_subscriptions_user_id
  ON podcast_subscriptions(user_id);

-- Add index for podcast lookups (for counting subscribers)
CREATE INDEX IF NOT EXISTS idx_podcast_subscriptions_podcast_id
  ON podcast_subscriptions(podcast_id);

-- Add latest_episode_date to podcasts table for badge logic
ALTER TABLE podcasts
  ADD COLUMN IF NOT EXISTS latest_episode_date TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE podcast_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth yet, will be restricted when auth is added)
CREATE POLICY "Allow all operations on podcast_subscriptions"
  ON podcast_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE podcast_subscriptions IS 'Tracks which users have subscribed to which podcasts via the Heart button';
COMMENT ON COLUMN podcast_subscriptions.last_viewed_at IS 'Used for new episode badge - compare with podcasts.latest_episode_date';
