import type { TimeSeriesPoint, LabeledCount } from './admin';

// Database enums
export type NotificationChannel = 'email' | 'telegram';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

// Database record types
export interface NotificationRequest {
  id: string;
  user_id: string;
  episode_id: string;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationStatus;
  scheduled: boolean;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  updated_at: string;
}

export interface TelegramConnection {
  id: string;
  user_id: string;
  telegram_chat_id: string;
  telegram_username: string | null;
  connected_at: string;
}

// API request/response types
export interface SendNotificationPayload {
  episodeId: string;
  channel: NotificationChannel;
  recipient: string;
  scheduled?: boolean;
}

export interface NotificationWithEpisode extends NotificationRequest {
  episode_title: string;
  podcast_name: string;
  podcast_image_url: string | null;
}

// Message content built from summary data
export interface ShareContent {
  episodeTitle: string;
  podcastName: string;
  podcastImageUrl: string | null;
  hookHeadline: string;
  highlights: string[];
  insightsUrl: string;
}

// Admin analytics types
export interface AdminNotificationMetrics {
  totalSent: number;
  sentToday: number;
  pending: number;
  failureRate: number;
  activeTelegramConnections: number;
}

export interface AdminNotificationData {
  metrics: AdminNotificationMetrics;
  notificationsOverTime: TimeSeriesPoint[];
  byChannel: LabeledCount[];
  scheduledVsInstant: LabeledCount[];
  pendingList: NotificationWithEpisode[];
  recentSends: NotificationWithEpisode[];
}
