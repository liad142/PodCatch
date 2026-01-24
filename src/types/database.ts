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
}
