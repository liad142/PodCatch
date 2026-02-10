export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface LabeledCount {
  label: string;
  count: number;
}

export interface OverviewStats {
  totalUsers: number;
  totalPodcasts: number;
  totalEpisodes: number;
  summariesReady: number;
  queueDepth: number;
  failureRate: number;
  totalSubscriptions: number;
  totalFollows: number;
  signupsOverTime: TimeSeriesPoint[];
  aiStatusBreakdown: LabeledCount[];
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
  }[];
}

export interface UserAnalytics {
  totalUsers: number;
  usersThisWeek: number;
  onboardingRate: number;
  signupsOverTime: TimeSeriesPoint[];
  genreDistribution: LabeledCount[];
  countryDistribution: LabeledCount[];
  recentUsers: {
    id: string;
    email: string;
    display_name: string | null;
    created_at: string;
    onboarding_completed: boolean;
  }[];
}

export interface ContentAnalytics {
  totalPodcasts: number;
  totalEpisodes: number;
  youtubeChannels: number;
  episodesOverTime: TimeSeriesPoint[];
  podcastsByLanguage: LabeledCount[];
  topPodcasts: {
    id: string;
    title: string;
    episode_count: number;
    image_url: string | null;
  }[];
  topYoutubeChannels: {
    id: string;
    title: string;
    follow_count: number;
  }[];
}

export interface AiAnalytics {
  totalSummaries: number;
  totalTranscripts: number;
  queueDepth: number;
  failureRate: number;
  summariesByLevelAndStatus: {
    level: string;
    status: string;
    count: number;
  }[];
  transcriptsByStatus: LabeledCount[];
  generationOverTime: TimeSeriesPoint[];
  recentFailures: {
    episode_id: string;
    episode_title: string;
    type: 'summary' | 'transcript';
    error_message: string | null;
    failed_at: string;
  }[];
}

export interface EngagementAnalytics {
  totalSubscriptions: number;
  totalFollows: number;
  totalBookmarks: number;
  subscriptionsOverTime: TimeSeriesPoint[];
  followsOverTime: TimeSeriesPoint[];
  topSubscribed: {
    id: string;
    title: string;
    subscriber_count: number;
    image_url: string | null;
  }[];
  topFollowed: {
    id: string;
    title: string;
    follower_count: number;
  }[];
  feedItemsBySource: LabeledCount[];
}

export interface SystemHealth {
  redis: {
    connected: boolean;
    latencyMs: number;
    cacheKeys: number;
  };
  recentErrors: {
    type: string;
    message: string;
    timestamp: string;
    episode_id?: string;
  }[];
}
