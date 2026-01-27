"use client";

import { useState, useEffect, useCallback } from "react";
import { StickyTabNav } from "./StickyTabNav";
import { SummaryTabContent } from "./insights/SummaryTabContent";
import { MindmapTabContent } from "./insights/MindmapTabContent";
import { TranscriptTabContent } from "./insights/TranscriptTabContent";
import { KeywordsTabContent } from "./insights/KeywordsTabContent";
import { HighlightsTabContent } from "./insights/HighlightsTabContent";
import { ShownotesTabContent } from "./insights/ShownotesTabContent";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { RefreshCw, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import type { InsightTab, EpisodeInsightsResponse, InsightsContent, SummaryData } from "@/types/database";

interface InsightHubProps {
  episodeId: string;
  initialTab?: InsightTab;
}

export function InsightHub({ episodeId, initialTab = 'summary' }: InsightHubProps) {
  const [activeTab, setActiveTab] = useState<InsightTab>(initialTab);
  const [data, setData] = useState<EpisodeInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch insights data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/episodes/${episodeId}/insights`);
      if (!res.ok) throw new Error('Failed to fetch insights');
      const json = await res.json();
      setData(json);
      setError(null);

      // Check if still processing
      const insightStatus = json.insights?.status;
      const isProcessing = ['queued', 'transcribing', 'summarizing'].includes(insightStatus);
      setIsGenerating(isProcessing);

      return json;
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('Failed to load insights');
      return null;
    }
  }, [episodeId]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));
  }, [fetchData]);

  // Polling while generating
  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      fetchData().then((json) => {
        if (json) {
          const status = json.insights?.status;
          if (!['queued', 'transcribing', 'summarizing'].includes(status)) {
            setIsGenerating(false);
          }
        }
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isGenerating, fetchData]);

  // Generate insights (and summaries)
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Generate insights (which includes transcript)
      const insightsRes = await fetch(`/api/episodes/${episodeId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!insightsRes.ok) throw new Error('Failed to start insights generation');

      // Also trigger quick summary generation
      fetch(`/api/episodes/${episodeId}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'quick' })
      });

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error generating insights:', err);
      setError('Failed to generate insights');
      setIsGenerating(false);
    }
  };

  // Generate specific summary level
  const handleGenerateSummary = async (level: 'quick' | 'deep') => {
    try {
      const res = await fetch(`/api/episodes/${episodeId}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });

      if (!res.ok) throw new Error('Failed to start summary generation');
      await fetchData();
    } catch (err) {
      console.error('Error generating summary:', err);
    }
  };

  // Extract data for components
  const insightsContent = data?.insights?.content as InsightsContent | undefined;
  const summaries = {
    quick: data?.summaries?.quick as SummaryData | undefined,
    deep: data?.summaries?.deep as SummaryData | undefined
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <SummaryTabContent
            summaries={{
              quick: summaries.quick ? {
                status: summaries.quick.status,
                content: summaries.quick.content as any
              } : undefined,
              deep: summaries.deep ? {
                status: summaries.deep.status,
                content: summaries.deep.content as any
              } : undefined
            }}
            isLoading={isLoading}
            onGenerate={handleGenerateSummary}
          />
        );

      case 'mindmap':
        return (
          <MindmapTabContent
            mindmap={insightsContent?.mindmap}
            isLoading={isLoading}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        );

      case 'transcript':
        return (
          <TranscriptTabContent
            transcript={data?.transcript_text}
            transcriptStatus={data?.transcript_status || 'not_started'}
            isLoading={isLoading}
          />
        );

      case 'keywords':
        return (
          <KeywordsTabContent
            keywords={insightsContent?.keywords}
            isLoading={isLoading}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        );

      case 'highlights':
        return (
          <HighlightsTabContent
            highlights={insightsContent?.highlights}
            isLoading={isLoading}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        );

      case 'shownotes':
        return (
          <ShownotesTabContent
            shownotes={insightsContent?.shownotes}
            isLoading={isLoading}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Desktop Tab Navigation */}
      <StickyTabNav activeTab={activeTab} onChange={setActiveTab} />

      {/* Error State */}
      {error && (
        <div className="p-4 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                fetchData().finally(() => setIsLoading(false));
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Generation Status Banner */}
      {isGenerating && (
        <div className="p-3 bg-primary/10 border-b">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">
              {data?.transcript_status === 'transcribing'
                ? 'Transcribing audio with Groq...'
                : data?.insights?.status === 'summarizing'
                ? 'Generating insights with Claude...'
                : 'Processing...'}
            </span>
          </div>
        </div>
      )}

      {/* Start Generation CTA (if nothing started) */}
      {!isLoading && !isGenerating && !data?.insights && !data?.transcript_text && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Generate Episode Insights</h2>
            <p className="text-muted-foreground">
              Get AI-powered summaries, keywords, highlights, and more from this episode.
              We'll transcribe the audio and analyze it for you.
            </p>
            <Button onClick={handleGenerate} size="lg" className="gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Insights
            </Button>
            <p className="text-xs text-muted-foreground">
              This may take a few minutes depending on the episode length
            </p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {(isLoading || isGenerating || data?.insights || data?.transcript_text) && (
        <div className="flex-1 overflow-auto pb-20 md:pb-4">
          {renderTabContent()}
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <StickyTabNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
