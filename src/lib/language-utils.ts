import { fetchPodcastFeed } from "@/lib/rss";

interface PodcastData {
  id: string;
  language: string | null;
  rss_feed_url: string;
}

/**
 * Resolve the podcast language using self-healing detection.
 * If language is cached and non-default, returns it.
 * Otherwise fetches from RSS and updates the DB.
 */
export async function resolvePodcastLanguage(
  podcastData: PodcastData | null,
  supabase: { from: (table: string) => any }
): Promise<string> {
  if (!podcastData) return 'en';

  let language = podcastData.language;

  // If language is already set and not 'en' (default), use it from DB cache
  if (language && language !== 'en') {
    return language;
  }

  // Language missing or 'en' (might be old default) - fetch from RSS to verify
  try {
    if (podcastData.rss_feed_url) {
      let rssLanguage: string | undefined;

      if (podcastData.rss_feed_url.startsWith('apple:')) {
        const appleId = podcastData.rss_feed_url.replace('apple:', '');
        const { getPodcastById } = await import('@/lib/apple-podcasts');
        const applePodcast = await getPodcastById(appleId, 'us');

        if (applePodcast?.feedUrl) {
          const { podcast: rssPodcast } = await fetchPodcastFeed(applePodcast.feedUrl);
          rssLanguage = rssPodcast.language;
        }
      } else {
        const { podcast: rssPodcast } = await fetchPodcastFeed(podcastData.rss_feed_url);
        rssLanguage = rssPodcast.language;
      }

      if (rssLanguage && rssLanguage !== language) {
        // Update DB for future requests
        await supabase
          .from('podcasts')
          .update({ language: rssLanguage })
          .eq('id', podcastData.id);

        return rssLanguage;
      }

      return rssLanguage || 'en';
    }
  } catch {
    // Fall through to default
  }

  return language || 'en';
}
