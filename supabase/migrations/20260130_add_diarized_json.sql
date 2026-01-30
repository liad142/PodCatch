-- Add diarized_json column to transcripts table
-- This stores the full diarized transcript with utterances and speaker info from Deepgram

ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS diarized_json JSONB;

COMMENT ON COLUMN transcripts.diarized_json IS 'Stores the full diarized transcript with utterances and speaker info';
