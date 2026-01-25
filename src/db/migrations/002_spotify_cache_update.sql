-- ============================================================================
-- Spotify Cache Table Update
-- Migration: 002_spotify_cache_update.sql
-- Description: Adds cached_at column to spotify_cache table
-- ============================================================================

-- Add cached_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spotify_cache' AND column_name = 'cached_at'
    ) THEN
        ALTER TABLE spotify_cache
        ADD COLUMN cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Rename created_at to cached_at if cached_at doesn't exist but created_at does
-- (This handles the case where the original migration was run)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spotify_cache' AND column_name = 'created_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spotify_cache' AND column_name = 'cached_at'
    ) THEN
        ALTER TABLE spotify_cache
        RENAME COLUMN created_at TO cached_at;
    END IF;
END $$;
