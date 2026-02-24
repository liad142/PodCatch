-- 013: YouTube Integration - Provider tokens + user profile flag
-- Stores OAuth tokens for YouTube Data API access

-- Provider tokens table (service-role only, never client-accessible)
CREATE TABLE IF NOT EXISTS user_provider_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- RLS: service-role only (tokens are sensitive)
ALTER TABLE user_provider_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role key can access

-- Add youtube_imported flag to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS youtube_imported BOOLEAN DEFAULT FALSE;
