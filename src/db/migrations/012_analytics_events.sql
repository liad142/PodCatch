-- Analytics event tracking tables
-- play_events: One row per play session
-- impression_events: When a podcast/episode appears in viewport
-- analytics_daily_rollups: Pre-aggregated daily metrics (for future optimization)

-- Play events table
-- podcast_id is TEXT (not UUID) because we track external Apple/RSS podcast IDs
CREATE TABLE IF NOT EXISTS play_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  episode_id TEXT NOT NULL,
  podcast_id TEXT NOT NULL,
  duration_listened INTEGER DEFAULT 0,
  episode_duration INTEGER,
  max_position INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  reached_60s BOOLEAN DEFAULT FALSE,
  reached_25pct BOOLEAN DEFAULT FALSE,
  reached_50pct BOOLEAN DEFAULT FALSE,
  reached_75pct BOOLEAN DEFAULT FALSE,
  source TEXT,
  playback_rate REAL DEFAULT 1.0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Play events indexes
CREATE INDEX idx_play_events_episode_id ON play_events(episode_id);
CREATE INDEX idx_play_events_podcast_id ON play_events(podcast_id);
CREATE INDEX idx_play_events_user_id ON play_events(user_id);
CREATE INDEX idx_play_events_started_at ON play_events(started_at);
CREATE INDEX idx_play_events_episode_reached_60s ON play_events(episode_id, reached_60s);

-- Impression events table
-- podcast_id is TEXT (not UUID) because we track external Apple/RSS podcast IDs
CREATE TABLE IF NOT EXISTS impression_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  podcast_id TEXT,
  episode_id TEXT,
  surface TEXT NOT NULL,
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impression events indexes
CREATE INDEX idx_impression_events_podcast_id ON impression_events(podcast_id);
CREATE INDEX idx_impression_events_episode_id ON impression_events(episode_id);
CREATE INDEX idx_impression_events_surface ON impression_events(surface);
CREATE INDEX idx_impression_events_created_at ON impression_events(created_at);

-- Daily rollups table (for future optimization)
CREATE TABLE IF NOT EXISTS analytics_daily_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  podcast_id TEXT NOT NULL,
  episode_id TEXT,
  total_plays INTEGER DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  total_listen_seconds INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  new_subscribers INTEGER DEFAULT 0,
  lost_subscribers INTEGER DEFAULT 0,
  UNIQUE(date, podcast_id, episode_id)
);

CREATE INDEX idx_rollups_podcast_date ON analytics_daily_rollups(podcast_id, date);
CREATE INDEX idx_rollups_episode_date ON analytics_daily_rollups(episode_id, date);

-- RLS policies
ALTER TABLE play_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE impression_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_rollups ENABLE ROW LEVEL SECURITY;

-- Users can read their own play events
CREATE POLICY "Users can read own play events"
  ON play_events FOR SELECT
  USING (auth.uid() = user_id);

-- Allow inserts via service role (API routes use admin client)
CREATE POLICY "Service role can insert play events"
  ON play_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update play events"
  ON play_events FOR UPDATE
  USING (true);

-- Impression events: insert-only via service role
CREATE POLICY "Service role can insert impression events"
  ON impression_events FOR INSERT
  WITH CHECK (true);

-- Daily rollups: public read (aggregated, no PII)
CREATE POLICY "Anyone can read daily rollups"
  ON analytics_daily_rollups FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage daily rollups"
  ON analytics_daily_rollups FOR ALL
  USING (true);
