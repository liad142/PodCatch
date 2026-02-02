"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InsightHero } from "./InsightHero";
import { MindmapTeaser } from "./MindmapTeaser";
import { HighlightsCarousel } from "./HighlightsCarousel";
import { TranscriptAccordion } from "./TranscriptAccordion";
import { ActionFooter } from "./ActionFooter";
import { QuickNav } from "./QuickNav";
import type { Episode, Podcast, EpisodeInsightsResponse, DeepSummaryContent } from "@/types/database";

interface EpisodeSmartFeedProps {
  episode: Episode & { podcast?: Podcast };
}

export type SectionId = "hero" | "mindmap" | "highlights" | "transcript";

export function EpisodeSmartFeed({ episode }: EpisodeSmartFeedProps) {
  const [data, setData] = useState<EpisodeInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section refs for QuickNav
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    hero: null,
    mindmap: null,
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

  // Polling while generating
  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      fetchData().then((json) => {
        if (json) {
          const status = json.insights?.status;
          if (!["queued", "transcribing", "summarizing"].includes(status)) {
            setIsGenerating(false);
          }
        }
      });
    }, 2500);

    return () => clearInterval(interval);
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

        {/* Section 2: Mindmap Teaser */}
        <section ref={setSectionRef("mindmap")} data-section="mindmap">
          <MindmapTeaser
            mindmap={insightsContent?.mindmap}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        </section>

        {/* Section 3: Highlights Carousel */}
        {(insightsContent?.highlights?.length ?? 0) > 0 && (
          <section ref={setSectionRef("highlights")} data-section="highlights">
            <HighlightsCarousel
              highlights={insightsContent?.highlights ?? []}
              episodeId={episode.id}
            />
          </section>
        )}

        {/* Section 4: Transcript Accordion */}
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
          />
        </section>
      </div>

      {/* Quick Nav (Elevator) */}
      <QuickNav
        sectionRefs={sectionRefs}
        onNavigate={scrollToSection}
        hasHighlights={(insightsContent?.highlights?.length ?? 0) > 0}
      />
    </div>
  );
}
