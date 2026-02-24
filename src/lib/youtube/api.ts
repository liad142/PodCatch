import { getYouTubeAccessToken } from './token-manager';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeSubscription {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
}

/**
 * Fetch all YouTube subscriptions for a user (paginated).
 * Uses the user's OAuth token.
 */
export async function fetchUserSubscriptions(userId: string): Promise<YouTubeSubscription[]> {
  const accessToken = await getYouTubeAccessToken(userId);
  if (!accessToken) return [];

  const subscriptions: YouTubeSubscription[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      mine: 'true',
      maxResults: '50',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`${YT_API_BASE}/subscriptions?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error('[YT_API] Failed to fetch subscriptions:', res.status, await res.text());
      break;
    }

    const data = await res.json();

    for (const item of data.items || []) {
      const snippet = item.snippet;
      subscriptions.push({
        channelId: snippet.resourceId.channelId,
        title: snippet.title,
        description: snippet.description || '',
        thumbnailUrl: snippet.thumbnails?.default?.url || snippet.thumbnails?.medium?.url || '',
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return subscriptions;
}

/**
 * Fetch recent videos from a channel's uploads playlist.
 * Uses API key (public data, no user token needed).
 */
export async function fetchChannelVideos(
  channelId: string,
  maxResults = 5
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[YT_API] YOUTUBE_API_KEY not set');
    return [];
  }

  // First, get the channel's uploads playlist ID
  const channelRes = await fetch(
    `${YT_API_BASE}/channels?${new URLSearchParams({
      part: 'contentDetails',
      id: channelId,
      key: apiKey,
    })}`
  );

  if (!channelRes.ok) {
    console.error('[YT_API] Failed to fetch channel:', channelRes.status);
    return [];
  }

  const channelData = await channelRes.json();
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  // Fetch playlist items (recent videos)
  const playlistRes = await fetch(
    `${YT_API_BASE}/playlistItems?${new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: String(maxResults),
      key: apiKey,
    })}`
  );

  if (!playlistRes.ok) {
    console.error('[YT_API] Failed to fetch playlist items:', playlistRes.status);
    return [];
  }

  const playlistData = await playlistRes.json();

  return (playlistData.items || []).map((item: any) => {
    const snippet = item.snippet;
    return {
      videoId: snippet.resourceId.videoId,
      title: snippet.title,
      description: snippet.description || '',
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
      publishedAt: snippet.publishedAt,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
    };
  });
}

/**
 * Fetch topic details for a batch of channel IDs.
 * Uses API key (public data). Batches in groups of 50 (YouTube API limit).
 */
export async function fetchChannelTopics(
  channelIds: string[]
): Promise<Record<string, { topicIds: string[]; topicCategories: string[] }>> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[YT_API] YOUTUBE_API_KEY not set');
    return {};
  }

  const results: Record<string, { topicIds: string[]; topicCategories: string[] }> = {};

  // Batch channel IDs in groups of 50
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);

    try {
      const res = await fetch(
        `${YT_API_BASE}/channels?${new URLSearchParams({
          part: 'topicDetails',
          id: batch.join(','),
          key: apiKey,
        })}`
      );

      if (!res.ok) {
        console.error('[YT_API] Failed to fetch channel topics:', res.status, await res.text());
        continue;
      }

      const data = await res.json();

      for (const item of data.items || []) {
        results[item.id] = {
          topicIds: item.topicDetails?.topicIds || [],
          topicCategories: item.topicDetails?.topicCategories || [],
        };
      }
    } catch (err) {
      console.error('[YT_API] Error fetching channel topics batch:', err);
      continue;
    }
  }

  return results;
}
