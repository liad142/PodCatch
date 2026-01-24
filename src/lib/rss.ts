import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    feed: ["image"],
    item: [
      ["itunes:duration", "duration"],
      ["itunes:image", "itunesImage"],
      ["enclosure", "enclosure"],
    ],
  },
});

export interface ParsedPodcast {
  title: string;
  description: string | undefined;
  image_url: string | undefined;
  author: string | undefined;
}

export interface ParsedEpisode {
  title: string;
  description: string | undefined;
  audio_url: string;
  duration_seconds: number | undefined;
  published_at: string | undefined;
}

function parseDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined;

  // Handle HH:MM:SS or MM:SS format
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  // Handle seconds only
  const seconds = parseInt(duration);
  return isNaN(seconds) ? undefined : seconds;
}

export async function fetchPodcastFeed(rssUrl: string): Promise<{
  podcast: ParsedPodcast;
  episodes: ParsedEpisode[];
}> {
  const feed = await parser.parseURL(rssUrl);

  const podcast: ParsedPodcast = {
    title: feed.title || "Unknown Podcast",
    description: feed.description,
    image_url: feed.image?.url || (feed as any).itunes?.image,
    author: (feed as any).itunes?.author || (feed as any).creator,
  };

  const episodes: ParsedEpisode[] = feed.items
    .filter((item) => item.enclosure?.url)
    .map((item) => ({
      title: item.title || "Untitled Episode",
      description: item.contentSnippet || item.content,
      audio_url: item.enclosure!.url,
      duration_seconds: parseDuration((item as any).duration),
      published_at: item.pubDate,
    }));

  return { podcast, episodes };
}
