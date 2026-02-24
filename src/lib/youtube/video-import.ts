import { createAdminClient } from '@/lib/supabase/admin';

interface VideoImportData {
  videoId: string;
  title: string;
  description?: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
  publishedAt?: string;
}

/**
 * Import a YouTube video into the episodes/podcasts tables.
 *
 * YouTube channel → stored as a `podcast` row with rss_feed_url = 'youtube:channel:{channelId}'
 * YouTube video → stored as an `episode` row with audio_url = YouTube watch URL
 */
export async function importYouTubeVideo(video: VideoImportData): Promise<{
  episodeId: string;
  podcastId: string;
  isNew: boolean;
}> {
  const supabase = createAdminClient();

  // Upsert the YouTube channel as a "podcast"
  const channelFeedUrl = `youtube:channel:${video.channelId}`;

  const { data: existingPodcast } = await supabase
    .from('podcasts')
    .select('id')
    .eq('rss_feed_url', channelFeedUrl)
    .single();

  let podcastId: string;

  if (existingPodcast) {
    podcastId = existingPodcast.id;
  } else {
    const { data: newPodcast, error: podcastError } = await supabase
      .from('podcasts')
      .insert({
        title: video.channelTitle,
        rss_feed_url: channelFeedUrl,
        image_url: video.thumbnailUrl || null,
        language: 'en',
      })
      .select('id')
      .single();

    if (podcastError || !newPodcast) {
      throw new Error(`Failed to create podcast for channel: ${podcastError?.message}`);
    }
    podcastId = newPodcast.id;
  }

  // Check if episode already exists
  const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  const { data: existingEpisode } = await supabase
    .from('episodes')
    .select('id')
    .eq('podcast_id', podcastId)
    .eq('audio_url', videoUrl)
    .single();

  if (existingEpisode) {
    return { episodeId: existingEpisode.id, podcastId, isNew: false };
  }

  // Create new episode
  const { data: newEpisode, error: episodeError } = await supabase
    .from('episodes')
    .insert({
      podcast_id: podcastId,
      title: video.title,
      description: video.description || null,
      audio_url: videoUrl,
      published_at: video.publishedAt || null,
    })
    .select('id')
    .single();

  if (episodeError || !newEpisode) {
    throw new Error(`Failed to create episode: ${episodeError?.message}`);
  }

  return { episodeId: newEpisode.id, podcastId, isNew: true };
}
