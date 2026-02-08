/**
 * Podcastindex.org API response types
 * https://podcastindex-org.github.io/docs-api/
 */

export interface PodcastIndexFeed {
  id: number;
  title: string;
  url: string;
  originalUrl: string;
  link: string;
  description: string;
  author: string;
  ownerName: string;
  image: string;
  artwork: string;
  lastUpdateTime: number;
  categories: Record<string, string>;
  itunesId: number | null;
  language: string;
  episodeCount: number;
  explicit: boolean;
}

export interface PodcastIndexEpisode {
  id: number;
  title: string;
  link: string;
  description: string;
  datePublished: number;
  enclosureUrl: string;
  enclosureType: string;
  enclosureLength: number;
  duration: number;
  image: string;
  feedImage: string;
  feedId: number;
  feedTitle: string;
  episode: number | null;
  season: number | null;
}

export interface PodcastIndexSearchResponse {
  status: string;
  feeds: PodcastIndexFeed[];
  count: number;
  description: string;
}

export interface PodcastIndexEpisodesResponse {
  status: string;
  items: PodcastIndexEpisode[];
  count: number;
  description: string;
}

export interface PodcastIndexTrendingResponse {
  status: string;
  feeds: PodcastIndexFeed[];
  count: number;
  description: string;
}

export interface PodcastIndexPodcastResponse {
  status: string;
  feed: PodcastIndexFeed;
  description: string;
}
