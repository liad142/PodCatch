export type BriefCategory = 'tool' | 'repo' | 'company' | 'metric' | 'insight';

export interface BriefItem {
  id: string;                    // `${episodeId}-${index}`
  headline: string;              // 1 bold line
  whyItMatters: string;          // 1 muted line
  category: BriefCategory;
  source: {
    name: string;                // podcast/channel title
    episodeTitle: string;
    episodeId: string;
    imageUrl?: string;           // podcast/channel avatar
    type: 'podcast' | 'youtube';
  };
  timestamp?: string;            // "12:34" display
  timestampSeconds?: number;     // for deep link seek
  resources?: Array<{
    name: string;
    type: 'github' | 'tool' | 'book' | 'person' | 'paper' | 'website';
    context?: string;
  }>;
}

export interface TodaysBriefResponse {
  items: BriefItem[];
  date: string;                  // ISO date of the data
  isStale: boolean;              // true = not today's data
}
