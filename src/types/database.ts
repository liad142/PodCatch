export interface Podcast {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  rss_feed_url: string;
  image_url: string | null;
  language: string;
  created_at: string;
}

export interface Episode {
  id: string;
  podcast_id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  published_at: string | null;
  created_at: string;
}

export interface Transcript {
  id: string;
  episode_id: string;
  full_text: string;
  language: string | null;
  provider: string;
  created_at: string;
}

export interface Summary {
  id: string;
  transcript_id: string;
  summary_text: string;
  key_points: string[] | null;
  resources: {
    github_repos?: string[];
    books?: string[];
    tools?: string[];
    links?: string[];
  } | null;
  created_at: string;
}

export interface EpisodeWithSummary extends Episode {
  transcript?: Transcript;
  summary?: Summary;
  summaryStatus?: SummaryStatus;
}

// Status types for the new summary system
export type TranscriptStatus = 'queued' | 'transcribing' | 'ready' | 'failed';
export type SummaryStatus = 'not_ready' | 'queued' | 'transcribing' | 'summarizing' | 'ready' | 'failed';
export type SummaryLevel = 'quick' | 'deep';

// Quick summary content structure
export interface QuickSummaryContent {
  tldr: string;
  key_takeaways: string[];
  who_is_this_for: string;
  topics: string[];
}

// Deep summary content structure
export interface DeepSummarySection {
  title: string;
  summary: string;
  key_points: string[];
}

export interface DeepSummaryResource {
  type: 'book' | 'tool' | 'website' | 'github' | 'paper' | 'other' | 'repo' | 'link' | 'person';
  label: string;
  url?: string;
  notes?: string;
}

export interface DeepSummaryActionPrompt {
  title: string;
  details: string;
}

export interface DeepSummaryContent {
  tldr: string;
  sections: DeepSummarySection[];
  resources: DeepSummaryResource[];
  action_prompts: DeepSummaryActionPrompt[];
  topics: string[];
}

// Extended transcript with status
export interface TranscriptWithStatus extends Transcript {
  status: TranscriptStatus;
  error_message?: string;
  updated_at: string;
}

// Summary record in database
export interface SummaryRecord {
  id: string;
  episode_id: string;
  level: SummaryLevel;
  language: string;
  status: SummaryStatus;
  content_json: QuickSummaryContent | DeepSummaryContent | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Summary data for API response
export interface SummaryData {
  status: SummaryStatus;
  content?: QuickSummaryContent | DeepSummaryContent;
  created_at?: string;
  updated_at?: string;
}

// API response structure for episode summaries
export interface EpisodeSummariesResponse {
  episode_id: string;
  summaries: {
    quick?: SummaryData;
    deep?: SummaryData;
  };
}
