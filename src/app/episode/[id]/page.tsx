"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { SummaryView } from "@/components/SummaryView";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import type { Episode, Podcast, Transcript, Summary } from "@/types/database";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Headphones,
  Sparkles,
  ExternalLink,
  Play,
} from "lucide-react";

interface EpisodeData extends Episode {
  podcast?: Podcast;
  transcript?: Transcript;
  summary?: Summary;
}

export default function EpisodePage() {
  const params = useParams();
  const episodeId = params.id as string;

  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<
    "transcribing" | "summarizing" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisodeData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch episode details
      const { data: episodeData, error: episodeError } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", episodeId)
        .single();

      if (episodeError) throw episodeError;

      // Fetch podcast details
      const { data: podcastData } = await supabase
        .from("podcasts")
        .select("*")
        .eq("id", episodeData.podcast_id)
        .single();

      // Fetch transcript if exists
      const { data: transcriptData } = await supabase
        .from("transcripts")
        .select("*")
        .eq("episode_id", episodeId)
        .single();

      let summaryData = null;
      if (transcriptData) {
        // Fetch summary if transcript exists
        const { data: summary } = await supabase
          .from("summaries")
          .select("*")
          .eq("transcript_id", transcriptData.id)
          .single();
        summaryData = summary;
      }

      setEpisode({
        ...episodeData,
        podcast: podcastData || undefined,
        transcript: transcriptData || undefined,
        summary: summaryData || undefined,
      });
    } catch (err) {
      console.error("Error fetching episode:", err);
      setError("Failed to load episode");
    } finally {
      setIsLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    if (episodeId) {
      fetchEpisodeData();
    }
  }, [episodeId, fetchEpisodeData]);

  const handleGenerateSummary = async () => {
    if (!episode) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Transcribe
      setGenerationStage("transcribing");

      const transcribeResponse = await fetch("/api/episodes/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId: episode.id }),
      });

      if (!transcribeResponse.ok) {
        const data = await transcribeResponse.json();
        throw new Error(data.error || "Transcription failed");
      }

      // Step 2: Summarize
      setGenerationStage("summarizing");

      const summarizeResponse = await fetch("/api/episodes/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId: episode.id }),
      });

      if (!summarizeResponse.ok) {
        const data = await summarizeResponse.json();
        throw new Error(data.error || "Summarization failed");
      }

      // Refresh episode data
      await fetchEpisodeData();
    } catch (err) {
      console.error("Error generating summary:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
      setGenerationStage(null);
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-32" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <div className="flex gap-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : error && !episode ? (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                Return to Home
              </Button>
            </Link>
          </div>
        ) : episode ? (
          <div className="space-y-8">
            {/* Back Button */}
            <Link href={`/podcast/${episode.podcast_id}`}>
              <Button variant="ghost" className="-ml-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {episode.podcast?.title || "Podcast"}
              </Button>
            </Link>

            {/* Episode Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {episode.podcast && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {episode.podcast.title}
                      </p>
                    )}
                    <CardTitle className="text-2xl md:text-3xl">
                      {episode.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {episode.published_at && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(episode.published_at)}
                    </Badge>
                  )}
                  {episode.duration_seconds && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(episode.duration_seconds)}
                    </Badge>
                  )}
                  {episode.summary && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Summary Available
                    </Badge>
                  )}
                </div>

                {episode.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {episode.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <a
                    href={episode.audio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      Listen to Episode
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Summary Section */}
            {isGenerating ? (
              <LoadingState stage={generationStage || "loading"} />
            ) : episode.summary ? (
              <SummaryView
                summary={episode.summary}
                transcript={episode.transcript}
                episodeTitle={episode.title}
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Headphones className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Summary Available
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Generate an AI-powered summary to get key insights, main
                    points, and curated resources from this episode.
                  </p>
                  <Button onClick={handleGenerateSummary} size="lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Summary
                  </Button>
                  {error && (
                    <p className="mt-4 text-sm text-destructive">{error}</p>
                  )}
                  <p className="mt-4 text-xs text-muted-foreground">
                    This may take 20-60 seconds depending on episode length
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Episode not found</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                Return to Home
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
