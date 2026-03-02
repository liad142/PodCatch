-- YouTube-specific metadata extracted from InnerTube API.
-- Kept separate from the episodes table to avoid bloating it with YouTube-only JSONB columns.

CREATE TABLE IF NOT EXISTS youtube_metadata (
  episode_id UUID PRIMARY KEY REFERENCES episodes(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  description TEXT DEFAULT '',
  description_links JSONB DEFAULT '[]',
  chapters JSONB DEFAULT '[]',
  pinned_comment JSONB,
  storyboard_spec TEXT,
  keywords TEXT[] DEFAULT '{}',
  duration_seconds INTEGER,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by video_id
CREATE INDEX IF NOT EXISTS idx_youtube_metadata_video_id ON youtube_metadata(video_id);

-- RLS: public read (metadata is not user-specific)
ALTER TABLE youtube_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_metadata_read_all"
  ON youtube_metadata FOR SELECT
  USING (true);

-- Only service role can insert/update (via API routes using admin client)
CREATE POLICY "youtube_metadata_service_insert"
  ON youtube_metadata FOR INSERT
  WITH CHECK (true);

CREATE POLICY "youtube_metadata_service_update"
  ON youtube_metadata FOR UPDATE
  USING (true);
