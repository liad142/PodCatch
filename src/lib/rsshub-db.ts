/**
 * Database functions for RSSHub YouTube integration
 */

import { createAdminClient } from '@/lib/supabase/admin';

// Use singleton admin client for connection pooling
function getSupabaseClient() {
  return createAdminClient();
}

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

export interface FeedItem {
  id: string;
  sourceType: 'youtube' | 'podcast';
  sourceId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  duration?: number;
  url: string;
  videoId?: string;
  episodeId?: string;
  bookmarked: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get or create YouTube channel
 */
export async function upsertYouTubeChannel(channelData: {
  channelId: string;
  channelName: string;
  channelUrl: string;
  channelHandle?: string;
  thumbnailUrl?: string;
  description?: string;
}): Promise<YouTubeChannel> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('youtube_channels')
    .upsert(
      {
        channel_id: channelData.channelId,
        channel_name: channelData.channelName,
        channel_url: channelData.channelUrl,
        channel_handle: channelData.channelHandle,
        thumbnail_url: channelData.thumbnailUrl,
        description: channelData.description,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'channel_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert channel: ${error.message}`);
  return data as YouTubeChannel;
}

/**
 * Follow a YouTube channel
 */
export async function followYouTubeChannel(
  userId: string,
  channelId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('youtube_channel_follows').insert({
    user_id: userId,
    channel_id: channelId,
  });

  if (error && !error.message.includes('duplicate')) {
    throw new Error(`Failed to follow channel: ${error.message}`);
  }
}

/**
 * Unfollow a YouTube channel
 */
export async function unfollowYouTubeChannel(
  userId: string,
  channelId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('youtube_channel_follows')
    .delete()
    .eq('user_id', userId)
    .eq('channel_id', channelId);

  if (error) throw new Error(`Failed to unfollow channel: ${error.message}`);
}

/**
 * Get all channels followed by user
 */
export async function getFollowedChannels(
  userId: string
): Promise<YouTubeChannel[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('youtube_channel_follows')
    .select('channel_id, youtube_channels(*)')
    .eq('user_id', userId)
    .order('followed_at', { ascending: false });

  if (error) throw new Error(`Failed to get followed channels: ${error.message}`);

  return (data || []).map((item: any) => item.youtube_channels as YouTubeChannel);
}

/**
 * Check if user follows a channel
 */
export async function isFollowingChannel(
  userId: string,
  channelId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('youtube_channel_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('channel_id', channelId)
    .single();

  return !!data && !error;
}

/**
 * Insert or update feed items (bulk upsert)
 */
export async function upsertFeedItems(items: Array<{
  sourceType: 'youtube' | 'podcast';
  sourceId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: Date;
  duration?: number;
  url: string;
  videoId?: string;
  episodeId?: string;
  userId: string;
}>): Promise<void> {
  const supabase = getSupabaseClient();
  const formattedItems = items.map((item) => ({
    source_type: item.sourceType,
    source_id: item.sourceId,
    title: item.title,
    description: item.description,
    thumbnail_url: item.thumbnailUrl,
    published_at: item.publishedAt.toISOString(),
    duration: item.duration,
    url: item.url,
    video_id: item.videoId,
    episode_id: item.episodeId,
    user_id: item.userId,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('feed_items')
    .upsert(formattedItems, {
      onConflict: 'user_id,source_type,video_id',
      ignoreDuplicates: false,
    });

  if (error) throw new Error(`Failed to upsert feed items: ${error.message}`);
}

/**
 * Get unified feed with filters
 */
export async function getFeed(params: {
  userId: string;
  sourceType?: 'youtube' | 'podcast' | 'all';
  mode?: 'following' | 'latest' | 'mixed';
  bookmarkedOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<FeedItem[]> {
  const supabase = getSupabaseClient();
  const {
    userId,
    sourceType = 'all',
    mode = 'latest',
    bookmarkedOnly = false,
    limit = 20,
    offset = 0,
  } = params;

  let query = supabase
    .from('feed_items')
    .select('*')
    .eq('user_id', userId);

  // Filter by source type
  if (sourceType !== 'all') {
    query = query.eq('source_type', sourceType);
  }

  // Filter by bookmarked
  if (bookmarkedOnly) {
    query = query.eq('bookmarked', true);
  }

  // Mode filtering
  if (mode === 'following') {
    // Only show items from followed channels
    const followedChannels = await getFollowedChannels(userId);
    const channelIds = followedChannels.map((ch) => ch.id);
    if (channelIds.length === 0) return [];
    query = query.in('source_id', channelIds);
  }

  // Order and pagination
  query = query
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get feed: ${error.message}`);

  return (data || []) as FeedItem[];
}

/**
 * Set bookmark state on a feed item (atomic, no read-before-write)
 */
export async function setBookmark(
  userId: string,
  feedItemId: string,
  bookmarked: boolean
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('feed_items')
    .update({ bookmarked, updated_at: new Date().toISOString() })
    .eq('id', feedItemId)
    .eq('user_id', userId)
    .select('bookmarked')
    .single();

  if (error) throw new Error(`Failed to set bookmark: ${error.message}`);
  if (!data) throw new Error('Feed item not found or unauthorized');

  return data.bookmarked;
}

/**
 * Toggle bookmark on a feed item
 * @deprecated Prefer setBookmark() to avoid read-before-write race conditions.
 * Kept for backward compatibility.
 */
export async function toggleBookmark(
  userId: string,
  feedItemId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  // Get current state
  const { data: item, error: fetchError } = await supabase
    .from('feed_items')
    .select('bookmarked')
    .eq('id', feedItemId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !item) {
    throw new Error('Feed item not found or unauthorized');
  }

  return setBookmark(userId, feedItemId, !item.bookmarked);
}

/**
 * Delete old feed items (cleanup job)
 * Keeps items for 90 days unless bookmarked
 */
export async function cleanupOldFeedItems(): Promise<number> {
  const supabase = getSupabaseClient();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data, error } = await supabase
    .from('feed_items')
    .delete()
    .lt('published_at', ninetyDaysAgo.toISOString())
    .eq('bookmarked', false)
    .select('id');

  if (error) throw new Error(`Failed to cleanup feed items: ${error.message}`);

  return (data || []).length;
}

/**
 * Get YouTube channel by channel_id (not UUID)
 */
export async function getYouTubeChannelByChannelId(
  channelId: string
): Promise<YouTubeChannel | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('youtube_channels')
    .select('*')
    .eq('channel_id', channelId)
    .single();

  if (error || !data) return null;
  return data as YouTubeChannel;
}
