-- Add FK from episode_comments.user_id → user_profiles.id
-- PostgREST requires this FK to resolve the embedded join:
--   .select('..., user_profiles (id, display_name, avatar_url)')
-- The original FK only points to auth.users, which PostgREST cannot traverse.

ALTER TABLE episode_comments
  ADD CONSTRAINT fk_episode_comments_user_profile
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
