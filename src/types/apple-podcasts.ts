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

// Country codes supported for Apple Podcasts (full storefront list)
export const APPLE_PODCAST_COUNTRIES = [
  { code: 'dz', name: 'Algeria', flag: '🇩🇿' },
  { code: 'ao', name: 'Angola', flag: '🇦🇴' },
  { code: 'ai', name: 'Anguilla', flag: '🇦🇮' },
  { code: 'ag', name: 'Antigua and Barbuda', flag: '🇦🇬' },
  { code: 'ar', name: 'Argentina', flag: '🇦🇷' },
  { code: 'am', name: 'Armenia', flag: '🇦🇲' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: 'at', name: 'Austria', flag: '🇦🇹' },
  { code: 'az', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'bs', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'bh', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'bb', name: 'Barbados', flag: '🇧🇧' },
  { code: 'be', name: 'Belgium', flag: '🇧🇪' },
  { code: 'bz', name: 'Belize', flag: '🇧🇿' },
  { code: 'bm', name: 'Bermuda', flag: '🇧🇲' },
  { code: 'bo', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'bw', name: 'Botswana', flag: '🇧🇼' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷' },
  { code: 'bn', name: 'Brunei', flag: '🇧🇳' },
  { code: 'bg', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'ky', name: 'Cayman Islands', flag: '🇰🇾' },
  { code: 'cl', name: 'Chile', flag: '🇨🇱' },
  { code: 'co', name: 'Colombia', flag: '🇨🇴' },
  { code: 'cr', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'hr', name: 'Croatia', flag: '🇭🇷' },
  { code: 'cy', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'cz', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'dk', name: 'Denmark', flag: '🇩🇰' },
  { code: 'dm', name: 'Dominica', flag: '🇩🇲' },
  { code: 'do', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'ec', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'eg', name: 'Egypt', flag: '🇪🇬' },
  { code: 'sv', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'ee', name: 'Estonia', flag: '🇪🇪' },
  { code: 'fi', name: 'Finland', flag: '🇫🇮' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'gh', name: 'Ghana', flag: '🇬🇭' },
  { code: 'gr', name: 'Greece', flag: '🇬🇷' },
  { code: 'gd', name: 'Grenada', flag: '🇬🇩' },
  { code: 'gt', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'gy', name: 'Guyana', flag: '🇬🇾' },
  { code: 'hn', name: 'Honduras', flag: '🇭🇳' },
  { code: 'hk', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'hu', name: 'Hungary', flag: '🇭🇺' },
  { code: 'is', name: 'Iceland', flag: '🇮🇸' },
  { code: 'in', name: 'India', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'ie', name: 'Ireland', flag: '🇮🇪' },
  { code: 'il', name: 'Israel', flag: '🇮🇱' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'jm', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'jo', name: 'Jordan', flag: '🇯🇴' },
  { code: 'kz', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'ke', name: 'Kenya', flag: '🇰🇪' },
  { code: 'kr', name: 'South Korea', flag: '🇰🇷' },
  { code: 'kw', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'kg', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'la', name: 'Laos', flag: '🇱🇦' },
  { code: 'lv', name: 'Latvia', flag: '🇱🇻' },
  { code: 'lb', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'lt', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'lu', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'mo', name: 'Macau', flag: '🇲🇴' },
  { code: 'my', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'mv', name: 'Maldives', flag: '🇲🇻' },
  { code: 'mt', name: 'Malta', flag: '🇲🇹' },
  { code: 'mu', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽' },
  { code: 'md', name: 'Moldova', flag: '🇲🇩' },
  { code: 'mn', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'ms', name: 'Montserrat', flag: '🇲🇸' },
  { code: 'mz', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'mm', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'na', name: 'Namibia', flag: '🇳🇦' },
  { code: 'np', name: 'Nepal', flag: '🇳🇵' },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'nz', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'ni', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'ng', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'mk', name: 'North Macedonia', flag: '🇲🇰' },
  { code: 'no', name: 'Norway', flag: '🇳🇴' },
  { code: 'om', name: 'Oman', flag: '🇴🇲' },
  { code: 'pk', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'pa', name: 'Panama', flag: '🇵🇦' },
  { code: 'pg', name: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'py', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'pe', name: 'Peru', flag: '🇵🇪' },
  { code: 'ph', name: 'Philippines', flag: '🇵🇭' },
  { code: 'pl', name: 'Poland', flag: '🇵🇱' },
  { code: 'pt', name: 'Portugal', flag: '🇵🇹' },
  { code: 'qa', name: 'Qatar', flag: '🇶🇦' },
  { code: 'ro', name: 'Romania', flag: '🇷🇴' },
  { code: 'sa', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'sn', name: 'Senegal', flag: '🇸🇳' },
  { code: 'sg', name: 'Singapore', flag: '🇸🇬' },
  { code: 'sk', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'si', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'za', name: 'South Africa', flag: '🇿🇦' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'lk', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'kn', name: 'St. Kitts and Nevis', flag: '🇰🇳' },
  { code: 'lc', name: 'St. Lucia', flag: '🇱🇨' },
  { code: 'vc', name: 'St. Vincent and the Grenadines', flag: '🇻🇨' },
  { code: 'sr', name: 'Suriname', flag: '🇸🇷' },
  { code: 'se', name: 'Sweden', flag: '🇸🇪' },
  { code: 'ch', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'tw', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'tz', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'th', name: 'Thailand', flag: '🇹🇭' },
  { code: 'tt', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'tn', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'tr', name: 'Turkey', flag: '🇹🇷' },
  { code: 'tc', name: 'Turks and Caicos Islands', flag: '🇹🇨' },
  { code: 'ug', name: 'Uganda', flag: '🇺🇬' },
  { code: 'ua', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'ae', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'uy', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'uz', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 've', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'vn', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'vg', name: 'British Virgin Islands', flag: '🇻🇬' },
  { code: 'ye', name: 'Yemen', flag: '🇾🇪' },
  { code: 'zw', name: 'Zimbabwe', flag: '🇿🇼' },
];

export interface ApplePodcastCache {
  cache_key: string;
  response_data: unknown;
  expires_at: string;
  created_at: string;
}
