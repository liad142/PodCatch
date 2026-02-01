export interface Podcast {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  rss_feed_url: string;
  image_url: string | null;
  language: string;
  created_at: string;
  latest_episode_date: string | null;
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

// ============================================
// EPISODE INSIGHTS HUB TYPES
// ============================================

// Insight tab types
export type InsightTab = 'summary' | 'mindmap' | 'transcript' | 'keywords' | 'highlights' | 'shownotes';

// Keyword structure
export interface KeywordItem {
  word: string;
  frequency: number;
  relevance: 'high' | 'medium' | 'low';
}

// Highlight structure (key quotes/moments)
export interface HighlightItem {
  quote: string;
  timestamp?: string; // "12:34" format
  context?: string;
  importance: 'critical' | 'important' | 'notable';
}

// Shownotes section
export interface ShownotesSection {
  timestamp?: string;
  title: string;
  content: string;
  links?: Array<{ label: string; url: string }>;
}

// Mindmap node for hierarchical view
export interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
}

// Complete insights content (stored in content_json)
export interface InsightsContent {
  keywords: KeywordItem[];
  highlights: HighlightItem[];
  shownotes: ShownotesSection[];
  mindmap: MindmapNode;
  generated_at: string;
}

// Insight status (reuses SummaryStatus values)
export type InsightStatus = SummaryStatus;

// API response for episode insights page
export interface EpisodeInsightsResponse {
  episode_id: string;
  transcript_status: TranscriptStatus | 'not_started';
  transcript_text?: string;
  insights?: {
    status: InsightStatus;
    content?: InsightsContent;
    updated_at?: string;
  };
  summaries: {
    quick?: SummaryData;
    deep?: SummaryData;
  };
}

// Podcast Subscription Types
export interface PodcastSubscription {
  id: string;
  user_id: string;
  podcast_id: string;
  created_at: string;
  last_viewed_at: string;
}

export interface PodcastWithSubscription extends Podcast {
  subscription?: PodcastSubscription;
  has_new_episodes?: boolean;
}
