/**
 * TypeScript type definitions for RSSHub YouTube integration
 */

export type ContentSourceType = 'youtube' | 'podcast';

export interface YouTubeChannel {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  channelHandle?: string;
  thumbnailUrl?: string;
  description?: string;
  subscriberCount?: number;
  videoCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface YouTubeChannelFollow {
  id: string;
  userId: string;
  channelId: string;
  followedAt: string;
}

export interface FeedItem {
  id: string;
  sourceType: ContentSourceType;
  sourceId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  duration?: number; // in seconds
  url: string;
  videoId?: string; // YouTube video ID
  episodeId?: string; // Podcast episode ID (future)
  bookmarked: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RSSHubCache {
  id: string;
  cacheKey: string;
  responseData: any; // JSON blob
  createdAt: string;
  expiresAt: string;
}

// API Response types
export interface FollowChannelRequest {
  input: string; // URL, channel ID, or @handle
  userId: string;
}

export interface FollowChannelResponse {
  success: boolean;
  channel: {
    id: string;
    channelId: string;
    channelName: string;
    channelUrl: string;
    thumbnailUrl?: string;
  };
  videosAdded: number;
}

export interface GetFeedRequest {
  userId: string;
  sourceType?: 'youtube' | 'podcast' | 'all';
  mode?: 'following' | 'latest' | 'mixed';
  bookmarkedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetFeedResponse {
  success: boolean;
  items: FeedItem[];
  total: number;
  hasMore: boolean;
}

export interface ToggleBookmarkRequest {
  userId: string;
}

export interface ToggleBookmarkResponse {
  success: boolean;
  bookmarked: boolean;
}

export interface RefreshChannelsRequest {
  userId: string;
}

export interface RefreshChannelsResponse {
  success: boolean;
  channelsRefreshed: number;
  videosAdded: number;
  errors?: string[];
}

export interface GetChannelsResponse {
  success: boolean;
  channels: YouTubeChannel[];
  total: number;
}
