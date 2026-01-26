-- Migration 004: Multi-Level Summaries Schema
-- Creates/updates transcripts table and new summaries table for multi-level summaries (quick/deep)

-- ============================================================================
-- TRANSCRIPTS TABLE
-- ============================================================================

-- Create transcripts table if it doesn't exist
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'not_ready' CHECK (status IN ('not_ready', 'queued', 'transcribing', 'ready', 'failed')),
  full_text TEXT,
  provider TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(episode_id, language)
);

-- ============================================================================
-- SUMMARIES TABLE
-- ============================================================================

-- Drop old summaries table if exists (it had transcript_id FK, we're restructuring)
DROP TABLE IF EXISTS summaries;

-- Create new summaries table with multi-level support
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('quick', 'deep')),
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'not_ready' CHECK (status IN ('not_ready', 'queued', 'transcribing', 'summarizing', 'ready', 'failed')),
  content_json JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(episode_id, level, language)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Transcripts indexes
CREATE INDEX IF NOT EXISTS idx_transcripts_episode_id ON transcripts(episode_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);

-- Summaries indexes
CREATE INDEX IF NOT EXISTS idx_summaries_episode_id ON summaries(episode_id);
CREATE INDEX IF NOT EXISTS idx_summaries_status ON summaries(status);
CREATE INDEX IF NOT EXISTS idx_summaries_level ON summaries(level);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

-- Create or replace the trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS update_transcripts_updated_at ON transcripts;
DROP TRIGGER IF EXISTS update_summaries_updated_at ON summaries;

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_transcripts_updated_at
    BEFORE UPDATE ON transcripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at
    BEFORE UPDATE ON summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all on transcripts" ON transcripts;
DROP POLICY IF EXISTS "Allow all on summaries" ON summaries;

-- Create permissive policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all on transcripts" ON transcripts FOR ALL USING (true);
CREATE POLICY "Allow all on summaries" ON summaries FOR ALL USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE transcripts IS 'Stores episode transcripts with status tracking';
COMMENT ON TABLE summaries IS 'Stores multi-level summaries (quick/deep) for episodes';
COMMENT ON COLUMN transcripts.status IS 'Processing status: not_ready, queued, transcribing, ready, failed';
COMMENT ON COLUMN summaries.level IS 'Summary level: quick (brief overview) or deep (detailed analysis)';
COMMENT ON COLUMN summaries.status IS 'Processing status: not_ready, queued, transcribing, summarizing, ready, failed';
COMMENT ON COLUMN summaries.content_json IS 'JSON content structure varies by level (QuickSummaryContent or DeepSummaryContent)';
