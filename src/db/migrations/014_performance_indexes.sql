-- Performance indexes for high-traffic query patterns
-- These prevent full table scans as data grows

-- Summaries: frequently queried by episode_id + status (polling, daily-mix)
CREATE INDEX IF NOT EXISTS idx_summaries_episode_status ON summaries(episode_id, status);

-- Summaries: filtered by status + level (daily-mix fetches ready quick/deep)
CREATE INDEX IF NOT EXISTS idx_summaries_status_level ON summaries(status, level);

-- Transcripts: checked by episode_id + status during summary generation
CREATE INDEX IF NOT EXISTS idx_transcripts_episode_status ON transcripts(episode_id, status);

-- Subscriptions: user's podcast list (queried on every /my-podcasts load)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON podcast_subscriptions(user_id);

-- Play events: episode analytics queries
CREATE INDEX IF NOT EXISTS idx_play_events_episode ON play_events(episode_id, created_at);

-- User summaries: user's summary history
CREATE INDEX IF NOT EXISTS idx_user_summaries_user ON user_summaries(user_id);
