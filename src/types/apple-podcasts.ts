/**
 * TypeScript type definitions for Apple Podcasts via RSSHub
 */

export interface ApplePodcast {
  id: string;
  name: string;
  artistName: string;
  description: string;
  artworkUrl: string;
  feedUrl?: string;
  genres: string[];
  trackCount: number;
  country: string;
  contentAdvisoryRating?: string;
  releaseDate?: string;
}

export interface AppleEpisode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  publishedAt: Date;
  duration: number; // in seconds
  audioUrl?: string;
  artworkUrl?: string;
  episodeNumber?: number;
  seasonNumber?: number;
}

export interface ApplePodcastFeed {
  podcast: ApplePodcast;
  episodes: AppleEpisode[];
}

export interface AppleSearchResult {
  resultCount: number;
  results: ApplePodcast[];
}

export interface AppleTopPodcastsResult {
  feed: {
    title: string;
    id: string;
    country: string;
    results: ApplePodcast[];
  };
}

export interface AppleGenre {
  id: string;
  name: string;
  url?: string;
}

// iTunes Search API response types
export interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesPodcast[];
}

export interface ITunesPodcast {
  wrapperType: string;
  kind: string;
  collectionId: number;
  trackId: number;
  artistName: string;
  collectionName: string;
  trackName: string;
  collectionCensoredName: string;
  trackCensoredName: string;
  collectionViewUrl: string;
  feedUrl: string;
  trackViewUrl: string;
  artworkUrl30: string;
  artworkUrl60: string;
  artworkUrl100: string;
  artworkUrl600?: string;
  collectionPrice: number;
  trackPrice: number;
  collectionHdPrice: number;
  releaseDate: string;
  collectionExplicitness: string;
  trackExplicitness: string;
  trackCount: number;
  country: string;
  currency: string;
  primaryGenreName: string;
  contentAdvisoryRating?: string;
  genreIds: string[];
  genres: string[];
}

// Apple Podcasts genres/categories
export const APPLE_PODCAST_GENRES: AppleGenre[] = [
  { id: '1301', name: 'Arts' },
  { id: '1321', name: 'Business' },
  { id: '1303', name: 'Comedy' },
  { id: '1304', name: 'Education' },
  { id: '1483', name: 'Fiction' },
  { id: '1511', name: 'Government' },
  { id: '1512', name: 'History' },
  { id: '1305', name: 'Health & Fitness' },
  { id: '1307', name: 'Kids & Family' },
  { id: '1309', name: 'Music' },
  { id: '1489', name: 'News' },
  { id: '1314', name: 'Religion & Spirituality' },
  { id: '1533', name: 'Science' },
  { id: '1324', name: 'Society & Culture' },
  { id: '1545', name: 'Sports' },
  { id: '1318', name: 'Technology' },
  { id: '1481', name: 'True Crime' },
  { id: '1310', name: 'TV & Film' },
];

// Country codes supported for Apple Podcasts
export const APPLE_PODCAST_COUNTRIES = [
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'il', name: 'Israel', flag: '🇮🇱' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: 'in', name: 'India', flag: '🇮🇳' },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽' },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'se', name: 'Sweden', flag: '🇸🇪' },
];

export interface ApplePodcastCache {
  cache_key: string;
  response_data: unknown;
  expires_at: string;
  created_at: string;
}
