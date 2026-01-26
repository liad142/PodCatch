-- Migration 005: Add 'insights' level to summaries table
-- Extends the summaries table to support the new insights feature
-- which stores keywords, highlights, shownotes, and mindmap data

-- ============================================================================
-- UPDATE LEVEL CHECK CONSTRAINT
-- ============================================================================

-- Drop the existing constraint and add a new one that includes 'insights'
ALTER TABLE summaries DROP CONSTRAINT IF EXISTS summaries_level_check;
ALTER TABLE summaries ADD CONSTRAINT summaries_level_check
  CHECK (level IN ('quick', 'deep', 'insights'));

-- ============================================================================
-- COMMENTS UPDATE
-- ============================================================================

COMMENT ON COLUMN summaries.level IS 'Summary level: quick (brief overview), deep (detailed analysis), or insights (keywords, highlights, shownotes, mindmap)';
COMMENT ON COLUMN summaries.content_json IS 'JSON content structure varies by level (QuickSummaryContent, DeepSummaryContent, or InsightsContent)';
