-- Migration: Language-Aware Transcription
-- Adds transcript_url and transcript_language columns to episodes table
-- This enables FREE transcript fetching from RSS feeds (Priority A) 
-- and explicit language passing to Deepgram (Priority B)

-- Add transcript URL column (from RSS <podcast:transcript> tag)
-- This allows FREE transcription without using Deepgram API
ALTER TABLE episodes 
ADD COLUMN IF NOT EXISTS transcript_url TEXT DEFAULT NULL;

-- Add transcript language column (from RSS transcript tag or channel language)
-- This avoids paying for Deepgram language detection
ALTER TABLE episodes 
ADD COLUMN IF NOT EXISTS transcript_language TEXT DEFAULT NULL;

-- Add index for quick lookup of episodes with available transcripts
CREATE INDEX IF NOT EXISTS idx_episodes_transcript_url 
ON episodes(transcript_url) 
WHERE transcript_url IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN episodes.transcript_url IS 'URL from RSS <podcast:transcript> tag - enables FREE transcription';
COMMENT ON COLUMN episodes.transcript_language IS 'Language code from RSS transcript tag or channel - avoids Deepgram detection costs';
