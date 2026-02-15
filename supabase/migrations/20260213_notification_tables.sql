-- Create notification_requests table for tracking share/notify-me actions
-- Supports immediate sends (email, telegram) and scheduled "notify when ready"

CREATE TABLE IF NOT EXISTS notification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  scheduled BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE notification_requests IS 'Tracks summary share/notification requests per user per episode';
COMMENT ON COLUMN notification_requests.channel IS 'Delivery channel: email or telegram';
COMMENT ON COLUMN notification_requests.recipient IS 'Email address or Telegram chat ID';
COMMENT ON COLUMN notification_requests.scheduled IS 'True if waiting for summary to be ready before sending';

CREATE INDEX idx_notification_requests_user ON notification_requests(user_id);
CREATE INDEX idx_notification_requests_episode_pending ON notification_requests(episode_id, status) WHERE status = 'pending';

-- RLS policies
ALTER TABLE notification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notifications"
  ON notification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notification_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on notification_requests"
  ON notification_requests FOR ALL
  USING (auth.role() = 'service_role');

-- Create telegram_connections table for linking Telegram accounts to users

CREATE TABLE IF NOT EXISTS telegram_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  telegram_username TEXT,
  connected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(telegram_chat_id)
);

COMMENT ON TABLE telegram_connections IS 'Links Telegram chat IDs to PodCatch user accounts';
COMMENT ON COLUMN telegram_connections.telegram_chat_id IS 'Telegram chat ID for sending messages via Bot API';

-- RLS policies
ALTER TABLE telegram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own telegram connection"
  ON telegram_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telegram connection"
  ON telegram_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram connection"
  ON telegram_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on telegram_connections"
  ON telegram_connections FOR ALL
  USING (auth.role() = 'service_role');
