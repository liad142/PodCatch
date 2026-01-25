-- ============================================================================
-- Spotify Podcast Discovery Cache Schema
-- Migration: 001_spotify_schema.sql
-- Description: Creates tables for caching Spotify podcast data
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: spotify_categories
-- Stores Spotify podcast categories/genres
-- ============================================================================
CREATE TABLE IF NOT EXISTS spotify_categories (
    id TEXT PRIMARY KEY,                          -- Spotify category ID
    name TEXT NOT NULL,                           -- Category display name
    icon_url TEXT,                                -- Category icon URL (nullable)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_spotify_categories_name ON spotify_categories(name);

-- ============================================================================
-- Table: spotify_shows
-- Stores Spotify podcast show metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS spotify_shows (
    id TEXT PRIMARY KEY,                          -- Spotify show ID
    name TEXT NOT NULL,                           -- Show title
    publisher TEXT,                               -- Publisher name
    description TEXT,                             -- Show description
    image_url TEXT,                               -- Show cover image URL
    total_episodes INTEGER NOT NULL DEFAULT 0,    -- Total episode count
    explicit BOOLEAN NOT NULL DEFAULT FALSE,      -- Explicit content flag
    languages TEXT[] NOT NULL DEFAULT '{}',       -- Array of language codes
    available_markets TEXT[] NOT NULL DEFAULT '{}', -- Array of market/country codes
    external_url TEXT NOT NULL,                   -- Spotify web URL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_spotify_shows_name ON spotify_shows(name);
CREATE INDEX IF NOT EXISTS idx_spotify_shows_publisher ON spotify_shows(publisher);
CREATE INDEX IF NOT EXISTS idx_spotify_shows_updated_at ON spotify_shows(updated_at);

-- GIN index for array containment queries on markets
CREATE INDEX IF NOT EXISTS idx_spotify_shows_available_markets ON spotify_shows USING GIN(available_markets);

-- GIN index for array containment queries on languages
CREATE INDEX IF NOT EXISTS idx_spotify_shows_languages ON spotify_shows USING GIN(languages);

-- ============================================================================
-- Table: spotify_episodes
-- Stores Spotify podcast episode metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS spotify_episodes (
    id TEXT PRIMARY KEY,                          -- Spotify episode ID
    show_id TEXT NOT NULL REFERENCES spotify_shows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                           -- Episode title
    description TEXT,                             -- Episode description
    duration_ms INTEGER NOT NULL DEFAULT 0,       -- Duration in milliseconds
    release_date TEXT NOT NULL,                   -- Release date (YYYY-MM-DD or YYYY-MM or YYYY)
    image_url TEXT,                               -- Episode cover image URL
    external_url TEXT NOT NULL,                   -- Spotify web URL
    explicit BOOLEAN NOT NULL DEFAULT FALSE,      -- Explicit content flag
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_spotify_episodes_show_id ON spotify_episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_spotify_episodes_release_date ON spotify_episodes(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_spotify_episodes_name ON spotify_episodes(name);

-- Composite index for show episodes sorted by release date
CREATE INDEX IF NOT EXISTS idx_spotify_episodes_show_release ON spotify_episodes(show_id, release_date DESC);

-- ============================================================================
-- Table: spotify_cache
-- Generic cache for Spotify API responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS spotify_cache (
    cache_key TEXT PRIMARY KEY,                   -- Cache key (e.g., "categories:US", "top_shows:IL")
    data JSONB NOT NULL,                          -- Cached JSON response data
    expires_at TIMESTAMPTZ NOT NULL,              -- Cache expiration timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding expired cache entries
CREATE INDEX IF NOT EXISTS idx_spotify_cache_expires_at ON spotify_cache(expires_at);

-- ============================================================================
-- Table: user_preferences
-- Stores anonymous user preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,                 -- Anonymous user ID from localStorage
    country TEXT NOT NULL DEFAULT 'US',           -- User's preferred country/market
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- Junction Table: spotify_show_categories
-- Many-to-many relationship between shows and categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS spotify_show_categories (
    show_id TEXT NOT NULL REFERENCES spotify_shows(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES spotify_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (show_id, category_id)
);

-- Indexes for efficient lookups in both directions
CREATE INDEX IF NOT EXISTS idx_spotify_show_categories_category ON spotify_show_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_spotify_show_categories_show ON spotify_show_categories(show_id);

-- ============================================================================
-- Updated_at Trigger Function
-- Automatically updates the updated_at column
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_spotify_categories_updated_at ON spotify_categories;
CREATE TRIGGER update_spotify_categories_updated_at
    BEFORE UPDATE ON spotify_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_spotify_shows_updated_at ON spotify_shows;
CREATE TRIGGER update_spotify_shows_updated_at
    BEFORE UPDATE ON spotify_shows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- For now, allow all operations - auth will be added later
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE spotify_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_show_categories ENABLE ROW LEVEL SECURITY;

-- Policies for spotify_categories (public read, service role write)
DROP POLICY IF EXISTS "Allow public read access to categories" ON spotify_categories;
CREATE POLICY "Allow public read access to categories"
    ON spotify_categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow all operations on categories" ON spotify_categories;
CREATE POLICY "Allow all operations on categories"
    ON spotify_categories FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policies for spotify_shows (public read, service role write)
DROP POLICY IF EXISTS "Allow public read access to shows" ON spotify_shows;
CREATE POLICY "Allow public read access to shows"
    ON spotify_shows FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow all operations on shows" ON spotify_shows;
CREATE POLICY "Allow all operations on shows"
    ON spotify_shows FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policies for spotify_episodes (public read, service role write)
DROP POLICY IF EXISTS "Allow public read access to episodes" ON spotify_episodes;
CREATE POLICY "Allow public read access to episodes"
    ON spotify_episodes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow all operations on episodes" ON spotify_episodes;
CREATE POLICY "Allow all operations on episodes"
    ON spotify_episodes FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policies for spotify_cache (service role only)
DROP POLICY IF EXISTS "Allow all operations on cache" ON spotify_cache;
CREATE POLICY "Allow all operations on cache"
    ON spotify_cache FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policies for user_preferences (users can manage their own preferences)
DROP POLICY IF EXISTS "Allow all operations on preferences" ON user_preferences;
CREATE POLICY "Allow all operations on preferences"
    ON user_preferences FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policies for spotify_show_categories
DROP POLICY IF EXISTS "Allow public read access to show_categories" ON spotify_show_categories;
CREATE POLICY "Allow public read access to show_categories"
    ON spotify_show_categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow all operations on show_categories" ON spotify_show_categories;
CREATE POLICY "Allow all operations on show_categories"
    ON spotify_show_categories FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- Utility Function: Clean Expired Cache
-- ============================================================================
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM spotify_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON TABLE spotify_categories IS 'Spotify podcast categories/genres cache';
COMMENT ON TABLE spotify_shows IS 'Spotify podcast show metadata cache';
COMMENT ON TABLE spotify_episodes IS 'Spotify podcast episode metadata cache';
COMMENT ON TABLE spotify_cache IS 'Generic cache for Spotify API responses';
COMMENT ON TABLE user_preferences IS 'Anonymous user preferences for personalization';
COMMENT ON TABLE spotify_show_categories IS 'Junction table linking shows to categories';
COMMENT ON FUNCTION clean_expired_cache() IS 'Removes expired entries from spotify_cache';
