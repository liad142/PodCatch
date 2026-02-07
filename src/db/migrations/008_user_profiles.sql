-- Migration 008: User profiles, subscription auth, and RLS policies
-- This migration adds Supabase Auth integration

-- ============================================================
-- 1. User Profiles Table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferred_genres TEXT[] DEFAULT '{}',
  preferred_country TEXT DEFAULT 'us',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Auto-create profile on auth.users INSERT
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. Migrate podcast_subscriptions.user_id from TEXT to UUID
-- ============================================================

-- Drop old data (pre-launch, no real data to preserve)
DELETE FROM podcast_subscriptions WHERE user_id = 'anonymous-user' OR user_id = 'demo-user-id';

-- Alter column type from TEXT to UUID
ALTER TABLE podcast_subscriptions
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Add foreign key to auth.users
ALTER TABLE podcast_subscriptions
  ADD CONSTRAINT fk_subscription_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- RLS for podcast_subscriptions
ALTER TABLE podcast_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON podcast_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON podcast_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON podcast_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON podcast_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. RLS for youtube_channel_follows
-- ============================================================

-- Clean old data
DELETE FROM youtube_channel_follows WHERE user_id::TEXT = 'demo-user-id' OR user_id::TEXT = 'anonymous-user';

ALTER TABLE youtube_channel_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own channel follows"
  ON youtube_channel_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow channels"
  ON youtube_channel_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow channels"
  ON youtube_channel_follows FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. RLS for feed_items
-- ============================================================

-- Clean old data
DELETE FROM feed_items WHERE user_id::TEXT = 'demo-user-id' OR user_id::TEXT = 'anonymous-user';

ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed items"
  ON feed_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own feed items"
  ON feed_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feed items"
  ON feed_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feed items"
  ON feed_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. Global tables - SELECT open to all
-- ============================================================

-- Podcasts: readable by anyone
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Podcasts are publicly readable"
  ON podcasts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage podcasts"
  ON podcasts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Episodes: readable by anyone
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Episodes are publicly readable"
  ON episodes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage episodes"
  ON episodes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Transcripts: readable by anyone
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transcripts are publicly readable"
  ON transcripts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage transcripts"
  ON transcripts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Summaries: readable by anyone
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Summaries are publicly readable"
  ON summaries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage summaries"
  ON summaries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- YouTube channels: readable by anyone
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "YouTube channels are publicly readable"
  ON youtube_channels FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage YouTube channels"
  ON youtube_channels FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 6. Service role policies for user-scoped tables
-- (allows admin client to bypass RLS)
-- ============================================================

CREATE POLICY "Service role full access to subscriptions"
  ON podcast_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to channel follows"
  ON youtube_channel_follows FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to feed items"
  ON feed_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to user profiles"
  ON user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
