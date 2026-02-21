import type { TimeSeriesPoint, LabeledCount } from './admin';

// ── Event source attribution ──
export type PlaySource =
  | 'discover_top'
  | 'discover_feed'
  | 'discover_daily_mix'
  | 'search'
  | 'podcast_page'
  | 'episode_page'
  | 'feed'
  | 'direct';

export type ImpressionSurface =
  | 'discover_top'
  | 'discover_feed'
  | 'discover_daily_mix'
  | 'search_results'
  | 'podcast_page'
  | 'personalized_shelf';

// ── Play event (DB row shape) ──
export interface PlayEvent {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  episode_id: string;
  podcast_id: string;
  duration_listened: number;
  episode_duration: number | null;
  max_position: number;
  completed: boolean;
  reached_60s: boolean;
  reached_25pct: boolean;
  reached_50pct: boolean;
  reached_75pct: boolean;
  source: PlaySource | null;
  playback_rate: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

// ── Impression event (DB row shape) ──
export interface ImpressionEvent {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  podcast_id: string | null;
  episode_id: string | null;
  surface: ImpressionSurface;
  position: number | null;
  created_at: string;
}

// ── API request payloads ──
export interface PlayEventPayload {
  action: 'start' | 'update' | 'end';
  session_id: string;
  episode_id: string;
  podcast_id: string;
  source?: PlaySource;
  episode_duration?: number;
  duration_listened?: number;
  max_position?: number;
  completed?: boolean;
  reached_60s?: boolean;
  reached_25pct?: boolean;
  reached_50pct?: boolean;
  reached_75pct?: boolean;
  playback_rate?: number;
}

export interface ImpressionEventPayload {
  impressions: {
    podcast_id?: string;
    episode_id?: string;
    surface: ImpressionSurface;
    position: number;
  }[];
}

// ── Podcast analytics response ──
export interface PodcastAnalytics {
  totalPlays: number;
  uniqueListeners: number;
  totalListenHours: number;
  followerCount: number;
  followerGrowth: number;
  impressionToPlayRate: number;
  playsOverTime: TimeSeriesPoint[];
  listenersOverTime: TimeSeriesPoint[];
  subscribersOverTime: TimeSeriesPoint[];
  topEpisodes: {
    episode_id: string;
    title: string;
    plays: number;
    listeners: number;
    avg_duration: number;
    completion_rate: number;
  }[];
  discoverySources: LabeledCount[];
}

// ── Episode analytics response ──
export interface EpisodeAnalytics {
  totalPlays: number;
  uniqueListeners: number;
  avgListenDuration: number;
  completionRate: number;
  retentionCurve: {
    milestone: string;
    percentage: number;
    count: number;
  }[];
  performanceVsAvg: {
    metric: string;
    episode: number;
    podcastAvg: number;
  }[];
  discoverySources: LabeledCount[];
  playsOverTime: TimeSeriesPoint[];
}

// ── Admin system-wide analytics ──
export interface SystemPlayAnalytics {
  totalPlays: number;
  totalListenHours: number;
  uniqueListeners: number;
  playsOverTime: TimeSeriesPoint[];
  topPodcastsByPlays: {
    podcast_id: string;
    title: string;
    plays: number;
    image_url: string | null;
  }[];
}

// ── Period filter ──
export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';
