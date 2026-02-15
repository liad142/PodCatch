-- Migration 011: User-scoped summaries
-- Creates a junction table to track which user generated each summary
-- Summaries content remains shared, but each user only sees their own on the summaries page

-- ============================================================================
-- USER_SUMMARIES JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_id UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
  episode_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, summary_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_summaries_user_id ON user_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_summaries_episode_id ON user_summaries(episode_id);
CREATE INDEX IF NOT EXISTS idx_user_summaries_user_episode ON user_summaries(user_id, episode_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own summaries" ON user_summaries;
DROP POLICY IF EXISTS "Users can insert own summaries" ON user_summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON user_summaries;

CREATE POLICY "Users can view own summaries" ON user_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries" ON user_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries" ON user_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_summaries IS 'Junction table tracking which user generated each summary';
COMMENT ON COLUMN user_summaries.user_id IS 'The user who generated this summary';
COMMENT ON COLUMN user_summaries.summary_id IS 'Reference to the shared summary content';
COMMENT ON COLUMN user_summaries.episode_id IS 'Denormalized episode_id for efficient queries';
