"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InsightHero } from "./InsightHero";
import { HighlightsCarousel } from "./HighlightsCarousel";
import { TranscriptAccordion } from "./TranscriptAccordion";
import { ActionFooter } from "./ActionFooter";
import { AskAIBar } from "./AskAIBar";
import { useActivateAskAI } from "@/contexts/AskAIContext";
import { useAudioPlayerSafe } from "@/contexts/AudioPlayerContext";
import { QuickNav } from "./QuickNav";
import { SubscriptionCard } from "./SubscriptionCard";
import { normalizeChronologicalSections, hasRealTimestamps } from "@/lib/summary-normalize";
import type { Episode, Podcast, EpisodeInsightsResponse, DeepSummaryContent } from "@/types/database";

interface EpisodeSmartFeedProps {
  episode: Episode & { podcast?: Podcast };
}

export type SectionId = "hero" | "highlights" | "transcript";

export function EpisodeSmartFeed({ episode }: EpisodeSmartFeedProps) {
  const [data, setData] = useState<EpisodeInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build track with chapters from deep summary (when available)
  const track = useMemo(() => {
    if (!episode.audio_url) return undefined;
    const deepContent = data?.summaries?.deep?.content as DeepSummaryContent | undefined;
    const sections = deepContent?.chronological_breakdown;
    let chapters: { title: string; timestamp: string; timestamp_seconds: number }[] | undefined;
    if (sections) {
      const normalized = normalizeChronologicalSections(sections);
      if (hasRealTimestamps(normalized)) {
        chapters = normalized
          .filter((s) => (s.timestamp_seconds ?? 0) >= 0 && s.timestamp)
          .map((s) => ({
            title: s.title || s.timestamp_description || 'Untitled',
            timestamp: s.timestamp!,
            timestamp_seconds: s.timestamp_seconds!,
          }));
      }
    }
    return {
      id: episode.id,
      title: episode.title,
      artist: episode.podcast?.title || 'Unknown Podcast',
      artworkUrl: episode.podcast?.image_url || '',
      audioUrl: episode.audio_url,
      duration: episode.duration_seconds ?? undefined,
      chapters,
    };
  }, [episode, data?.summaries?.deep]);

  // Signal to the global AskAI context that we're on an insights page
  useActivateAskAI(episode.id);

  // Inject chapters into an already-playing track when data loads
  const player = useAudioPlayerSafe();
  useEffect(() => {
    if (!player || !track?.chapters?.length) return;
    if (player.currentTrack?.id === episode.id && !player.currentTrack.chapters?.length) {
      player.updateTrackMeta({ chapters: track.chapters });
    }
  }, [player, track?.chapters, episode.id]);

  // Section refs for QuickNav
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    hero: null,
    highlights: null,
    transcript: null,
  });

  // Fetch insights data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/episodes/${episode.id}/insights`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      const json = await res.json();
      setData(json);
      setError(null);

      // Check if still processing
      const insightStatus = json.insights?.status;
      const isProcessing = ["queued", "transcribing", "summarizing"].includes(insightStatus);
      setIsGenerating(isProcessing);

      return json;
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError("Failed to load insights");
      return null;
    }
  }, [episode.id]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));
  }, [fetchData]);

  // Polling while generating (exponential backoff: 2s initial, 1.5x, 15s max, 60 attempts cap)
  useEffect(() => {
    if (!isGenerating) return;

    let delay = 2000;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = () => {
      if (attempts >= 60) {
        setIsGenerating(false);
        setError("Generation timed out. Please try again.");
        return;
      }
      attempts++;
      fetchData().then((json) => {
        if (json) {
          const status = json.insights?.status;
          if (!["queued", "transcribing", "summarizing"].includes(status)) {
            setIsGenerating(false);
            return;
          }
        }
        delay = Math.min(delay * 1.5, 15000);
        timeoutId = setTimeout(poll, delay);
      });
    };

    timeoutId = setTimeout(poll, delay);
    return () => clearTimeout(timeoutId);
  }, [isGenerating, fetchData]);

  // Generate insights
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Generate insights
      const insightsRes = await fetch(`/api/episodes/${episode.id}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!insightsRes.ok) throw new Error("Failed to start insights generation");

      // Trigger BOTH Quick and Deep summary generation in parallel
      // Quick Summary is shown in the Hero section
      // Deep Summary provides the detailed analysis
      Promise.all([
        fetch(`/api/episodes/${episode.id}/summaries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level: "quick" }),
        }),
        fetch(`/api/episodes/${episode.id}/summaries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level: "deep" }),
        }),
      ]);

      await fetchData();
    } catch (err) {
      console.error("Error generating insights:", err);
      setError("Failed to generate insights");
      setIsGenerating(false);
    }
  };

  // Register section ref
  const setSectionRef = (id: SectionId) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  // Scroll to section
  const scrollToSection = (id: SectionId) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Extract data for components
  const summaries = {
    quick: data?.summaries?.quick,
    deep: data?.summaries?.deep,
  };
  const insightsContent = data?.insights?.content;
  const hasAnyContent = data?.insights || data?.transcript_text || summaries.quick || summaries.deep;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  // Empty state - no content generated yet
  if (!hasAnyContent && !isGenerating) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md space-y-6 p-8"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Unlock Episode Insights</h2>
            <p className="text-muted-foreground">
              Get AI-powered summaries, key quotes, mindmaps, and a searchable transcript.
            </p>
          </div>
          <Button onClick={handleGenerate} size="lg" className="gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Insights
          </Button>
          <p className="text-xs text-muted-foreground">
            This may take a few minutes depending on episode length
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Generation Status Banner */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 p-3 bg-primary/10 backdrop-blur-sm border-b"
        >
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">
              {data?.transcript_status === "transcribing"
                ? "Transcribing audio..."
                : data?.insights?.status === "summarizing"
                  ? "Generating insights with AI..."
                  : "Processing..."}
            </span>
          </div>
        </motion.div>
      )}

      {/* Main Feed */}
      <div className="pb-28 space-y-8">
        {/* Section 1: Hero/Hook */}
        <section ref={setSectionRef("hero")} data-section="hero">
          <InsightHero
            episode={episode}
            quickSummary={summaries.quick}
            deepSummary={summaries.deep}
            isGenerating={isGenerating}
          />
        </section>

        {/* Section 2: Highlights Carousel */}
        {(insightsContent?.highlights?.length ?? 0) > 0 && (
          <section ref={setSectionRef("highlights")} data-section="highlights">
            <HighlightsCarousel
              highlights={insightsContent?.highlights ?? []}
              episodeId={episode.id}
            />
          </section>
        )}

        {/* Section 3: Transcript Accordion */}
        <section ref={setSectionRef("transcript")} data-section="transcript">
          <TranscriptAccordion
            transcript={data?.transcript_text}
            transcriptStatus={data?.transcript_status || "not_started"}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        </section>

        {/* Section 5: Action Footer */}
        <section data-section="actions">
          <ActionFooter
            episode={episode}
            actionPrompts={(summaries.deep?.content as DeepSummaryContent | undefined)?.actionable_takeaways}
            summaryReady={summaries.quick?.status === 'ready' || summaries.deep?.status === 'ready'}
          />
        </section>

        {/* Section 6: Automated Subscription */}
        <section data-section="subscriptions" className="px-4 md:px-0 max-w-3xl mx-auto">
          <SubscriptionCard
            podcastName={episode.podcast?.title || "this podcast"}
            podcastId={episode.podcast?.id || ""}
          />
        </section>
      </div>

      {/* Standalone Ask AI Bar (visible when player is not active) */}
      <AskAIBar mode="standalone" track={track} />

      {/* Quick Nav (Elevator) */}
      <QuickNav
        sectionRefs={sectionRefs}
        onNavigate={scrollToSection}
        hasHighlights={(insightsContent?.highlights?.length ?? 0) > 0}
      />
    </div>
  );
}
