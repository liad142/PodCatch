"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles, FileText, Lightbulb, ListMusic, Scale, Play, ChevronDown, ChevronsUpDown, ChevronsDownUp, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TranscriptAccordion } from "./TranscriptAccordion";
import { ActionFooter } from "./ActionFooter";
import { AskAIBar } from "./AskAIBar";
import { useActivateAskAI } from "@/contexts/AskAIContext";
import { useAudioPlayerSafe } from "@/contexts/AudioPlayerContext";
import { SubscriptionCard } from "./SubscriptionCard";
import { normalizeChronologicalSections, hasRealTimestamps, parseHighlightMarkers } from "@/lib/summary-normalize";
import { cn } from "@/lib/utils";
import { isRTLText } from "@/lib/rtl";
import { AnimatePresence } from "framer-motion";
import type { Episode, Podcast, EpisodeInsightsResponse, DeepSummaryContent, QuickSummaryContent, ChronologicalSection } from "@/types/database";

interface EpisodeSmartFeedProps {
  episode: Episode & { podcast?: Podcast };
}

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

  // Fetch insights data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/episodes/${episode.id}/insights`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      const json = await res.json();
      setData(json);
      setError(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.id]);

  // Polling while generating
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
      const insightsRes = await fetch(`/api/episodes/${episode.id}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!insightsRes.ok) throw new Error("Failed to start insights generation");

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

  // Extract data for sections
  const quickContent = data?.summaries?.quick?.content as QuickSummaryContent | undefined;
  const deepContent = data?.summaries?.deep?.content as DeepSummaryContent | undefined;
  const isQuickReady = data?.summaries?.quick?.status === "ready" && quickContent;
  const isDeepReady = data?.summaries?.deep?.status === "ready" && deepContent;
  const hasAnyContent = data?.insights || data?.transcript_text || data?.summaries?.quick || data?.summaries?.deep;

  // RTL detection
  const isRTL = useMemo(() => {
    const textToCheck = quickContent?.executive_brief || quickContent?.hook_headline ||
      deepContent?.comprehensive_overview || episode.description || "";
    return isRTLText(textToCheck);
  }, [quickContent, deepContent, episode.description]);

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

  // Empty state
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

      {/* Main Feed — Linear sections */}
      <div className="pb-28 space-y-10 max-w-3xl mx-auto px-4 md:px-0">

        {/* ─── Section 1: Teaser Card ─── */}
        {isQuickReady && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <TeaserCard content={quickContent!} isRTL={isRTL} />
          </motion.section>
        )}

        {/* ─── Section 2: Comprehensive Overview ─── */}
        {isDeepReady && deepContent!.comprehensive_overview && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <ComprehensiveOverview text={deepContent!.comprehensive_overview} isRTL={isRTL} />
          </motion.section>
        )}

        {/* ─── Section 3: Core Concepts ─── */}
        {isDeepReady && deepContent!.core_concepts?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <CoreConcepts concepts={deepContent!.core_concepts} isRTL={isRTL} />
          </motion.section>
        )}

        {/* ─── Section 4: Episode Chapters ─── */}
        {isDeepReady && deepContent!.chronological_breakdown?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <EpisodeChapters
              sections={deepContent!.chronological_breakdown}
              isRTL={isRTL}
              episode={episode}
            />
          </motion.section>
        )}

        {/* ─── Section 5: Contrarian Views ─── */}
        {isDeepReady && deepContent!.contrarian_views?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <ContrarianViews views={deepContent!.contrarian_views} isRTL={isRTL} />
          </motion.section>
        )}

        {/* ─── Section 6: Transcript ─── */}
        <section>
          <TranscriptAccordion
            transcript={data?.transcript_text}
            transcriptStatus={data?.transcript_status || "not_started"}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        </section>

        {/* ─── Section 7: Action Items ─── */}
        <section>
          <ActionFooter
            episode={episode}
            actionPrompts={deepContent?.actionable_takeaways}
            summaryReady={data?.summaries?.quick?.status === 'ready' || data?.summaries?.deep?.status === 'ready'}
          />
        </section>

        {/* Subscription */}
        <section>
          <SubscriptionCard
            podcastName={episode.podcast?.title || "this podcast"}
            podcastId={episode.podcast?.id || ""}
          />
        </section>
      </div>

      {/* Standalone Ask AI Bar */}
      <AskAIBar mode="standalone" track={track} />
    </div>
  );
}


/* ═══════════════════════════════════════════
   Section Components
   ═══════════════════════════════════════════ */

/** Section header with icon + label */
function SectionHeader({ icon: Icon, label, iconClassName, subtitle, isRTL, children }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  iconClassName?: string;
  subtitle?: string;
  isRTL?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-5", isRTL && "flex-row-reverse")}>
      <div>
        <h2 className={cn(
          "text-h2 text-foreground flex items-center gap-2",
          isRTL && "flex-row-reverse",
        )}>
          <Icon className={cn("h-5 w-5", iconClassName)} />
          {label}
        </h2>
        {subtitle && (
          <p className="text-body-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── 1. Teaser Card ─── */
function TeaserCard({ content, isRTL }: { content: QuickSummaryContent; isRTL: boolean }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-[var(--shadow-1)] p-6 lg:p-8 space-y-6">
      {/* Headline */}
      {content.hook_headline && (
        <h2 className={cn(
          "text-display text-foreground",
          isRTL && "text-right"
        )}>
          {content.hook_headline}
        </h2>
      )}

      {/* Executive Brief */}
      {content.executive_brief && (
        <p className={cn(
          "text-body text-muted-foreground prose-width",
          isRTL && "text-right"
        )}>
          {content.executive_brief}
        </p>
      )}

      {/* Golden Nugget */}
      {content.golden_nugget && (
        <div className={cn(
          "bg-[var(--accent-amber-subtle)] rounded-r-xl p-4",
          isRTL
            ? "border-r-4 border-[hsl(var(--accent-amber))]"
            : "border-l-4 border-[hsl(var(--accent-amber))]"
        )}>
          <div className={cn("flex items-center gap-2 mb-2", isRTL && "flex-row-reverse")}>
            <Quote className="h-5 w-5 text-amber-500" />
            <span className="text-caption font-bold text-[hsl(var(--accent-amber))] uppercase tracking-wider">Golden Nugget</span>
          </div>
          <p className={cn("text-body italic text-foreground font-medium", isRTL && "text-right")}>
            &ldquo;{content.golden_nugget}&rdquo;
          </p>
        </div>
      )}

      {/* Perfect For + Tags */}
      {(content.perfect_for || (content.tags && content.tags.length > 0)) && (
        <div className={cn("flex flex-wrap items-center gap-2", isRTL && "flex-row-reverse")}>
          {content.perfect_for && (
            <Badge variant="secondary">
              {content.perfect_for}
            </Badge>
          )}
          {content.tags?.map((tag, i) => (
            <Badge key={i} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── 2. Comprehensive Overview ─── */
function ComprehensiveOverview({ text, isRTL }: { text: string; isRTL: boolean }) {
  return (
    <div>
      <SectionHeader icon={FileText} label="Comprehensive Overview" isRTL={isRTL} />
      <div className={cn("prose-width", isRTL && "text-right")}>
        {text.split('\n').filter(p => p.trim()).map((paragraph, i) => (
          <AnnotatedParagraph key={i} text={paragraph} isRTL={isRTL} />
        ))}
      </div>
    </div>
  );
}

/** Render paragraph with <<highlighted>> markers */
function AnnotatedParagraph({ text, isRTL }: { text: string; isRTL: boolean }) {
  const segments = parseHighlightMarkers(text);
  return (
    <p className={cn("text-body text-muted-foreground leading-relaxed mb-6 last:mb-0", isRTL && "text-right")}>
      {segments.map((seg, i) =>
        seg.type === "highlight" ? (
          <mark
            key={i}
            className="bg-[var(--accent-amber-subtle)] text-foreground px-1 rounded font-medium"
          >
            {seg.content}
          </mark>
        ) : (
          <span key={i}>{seg.content}</span>
        )
      )}
    </p>
  );
}

/* ─── 3. Core Concepts ─── */
function CoreConcepts({ concepts, isRTL }: {
  concepts: DeepSummaryContent["core_concepts"];
  isRTL: boolean;
}) {
  return (
    <div>
      <SectionHeader icon={Lightbulb} label="Core Concepts" iconClassName="text-amber-500" isRTL={isRTL} />
      <div className="grid gap-4">
        {concepts.map((concept, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl shadow-[var(--shadow-1)] p-6">
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <div className="w-7 h-7 rounded-full bg-[var(--primary-subtle)] text-primary text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <h3 className={cn("text-h3 text-foreground", isRTL && "text-right")}>
                {concept.concept}
              </h3>
            </div>
            <p className={cn("text-body text-muted-foreground mt-3", isRTL && "text-right")}>
              {concept.explanation}
            </p>
            {concept.quote_reference && (
              <blockquote className={cn(
                "mt-4 pl-4 border-l-2 border-border-strong text-body-sm text-muted-foreground italic",
                isRTL && "border-l-0 border-r-2 pr-4 pl-0 text-right"
              )}>
                &ldquo;{concept.quote_reference}&rdquo;
              </blockquote>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 4. Episode Chapters ─── */
function EpisodeChapters({ sections, isRTL, episode }: {
  sections: ChronologicalSection[];
  isRTL: boolean;
  episode: Episode & { podcast?: Podcast };
}) {
  const normalized = useMemo(() => normalizeChronologicalSections(sections), [sections]);
  const showTimestamps = useMemo(() => hasRealTimestamps(normalized), [normalized]);
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const [allExpanded, setAllExpanded] = useState(false);
  const player = useAudioPlayerSafe();

  const chapters = useMemo(() => {
    if (!showTimestamps) return undefined;
    return normalized
      .filter((s) => (s.timestamp_seconds ?? 0) >= 0 && s.timestamp)
      .map((s) => ({
        title: s.title || s.timestamp_description || 'Untitled',
        timestamp: s.timestamp!,
        timestamp_seconds: s.timestamp_seconds!,
      }));
  }, [normalized, showTimestamps]);

  const chapterTrack = useMemo(() => {
    if (!episode.audio_url) return null;
    return {
      id: episode.id,
      title: episode.title,
      artist: episode.podcast?.title || 'Unknown Podcast',
      artworkUrl: episode.podcast?.image_url || '',
      audioUrl: episode.audio_url,
      duration: episode.duration_seconds ?? undefined,
      chapters,
    };
  }, [episode, chapters]);

  const activeIndex = useMemo(() => {
    if (!player || !showTimestamps) return -1;
    const time = player.currentTime;
    let active = -1;
    for (let i = 0; i < normalized.length; i++) {
      const sec = normalized[i].timestamp_seconds ?? 0;
      if (sec <= time) active = i;
    }
    return active;
  }, [player?.currentTime, normalized, showTimestamps, player]);

  const handleSeekTo = (seconds: number) => {
    if (seconds < 0 || !player) return;
    const isTrackLoaded = player.currentTrack?.audioUrl === chapterTrack?.audioUrl;
    if (isTrackLoaded) {
      player.seek(seconds);
      if (!player.isPlaying) player.play();
    } else if (chapterTrack) {
      player.playFromTime(chapterTrack, seconds);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
    setAllExpanded(false);
  };

  const toggleAll = () => {
    setAllExpanded(!allExpanded);
    if (allExpanded) setExpandedIndex(0);
  };

  if (normalized.length === 0) return null;

  return (
    <div>
      <SectionHeader icon={ListMusic} label="Episode Chapters" isRTL={isRTL}>
        {normalized.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="text-xs gap-1 h-7 text-muted-foreground"
          >
            {allExpanded ? (
              <><ChevronsDownUp className="h-3 w-3" /> Collapse All</>
            ) : (
              <><ChevronsUpDown className="h-3 w-3" /> Expand All</>
            )}
          </Button>
        )}
      </SectionHeader>

      <div dir={isRTL ? "rtl" : "ltr"} className="space-y-1">
        {normalized.map((section, i) => {
          const isActive = i === activeIndex;
          const isExpanded = allExpanded || expandedIndex === i;
          const sectionTitle = section.title || section.timestamp_description || `Section ${i + 1}`;
          const hasTimestamp = showTimestamps && (section.timestamp_seconds ?? 0) > 0;

          return (
            <div
              key={i}
              className={cn(
                "rounded-xl transition-colors duration-150",
                isActive
                  ? "bg-[var(--primary-subtle)] border border-primary"
                  : "hover:bg-secondary"
              )}
            >
              {/* Clickable row */}
              <button
                onClick={() => toggleExpand(i)}
                className={cn(
                  "w-full p-4 cursor-pointer",
                  isRTL ? "text-right" : "text-left",
                )}
              >
                <div className={cn("flex items-center gap-2 flex-wrap", isRTL && "flex-row-reverse")}>
                  {hasTimestamp && (
                    <span
                      role="button"
                      className="text-caption bg-secondary px-2 py-1 rounded-md font-mono shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeekTo(section.timestamp_seconds!);
                      }}
                    >
                      {section.timestamp}
                    </span>
                  )}
                  <span className={cn(
                    "text-h4 text-foreground",
                    isActive && "text-primary"
                  )}>
                    {sectionTitle}
                  </span>
                  {isActive && (
                    <span className="bg-primary text-primary-foreground text-caption px-2 py-0.5 rounded-full font-medium shrink-0">
                      Now Playing
                    </span>
                  )}
                  {!isExpanded && (
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground shrink-0",
                      isRTL ? "mr-auto" : "ml-auto"
                    )} />
                  )}
                </div>

                {/* Summary teaser (collapsed only) */}
                {!isExpanded && section.hook && (
                  <p className="text-body-sm text-muted-foreground mt-1 line-clamp-2">
                    {section.hook}
                  </p>
                )}
              </button>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className={cn(
                      "px-4 pb-4 space-y-2",
                      isRTL ? "pr-4" : "pl-4"
                    )}>
                      {section.hook && (
                        <p className="text-body-sm text-muted-foreground italic">
                          {section.hook}
                        </p>
                      )}
                      <p className="text-body text-muted-foreground prose-width">
                        {section.content}
                      </p>
                      {hasTimestamp && (
                        <div className="pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2 h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeekTo(section.timestamp_seconds!);
                            }}
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Play from ~{section.timestamp}
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 5. Contrarian Views ─── */
/** Render text with **bold** markers as <strong> tags */
function renderBoldMarkers(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function ContrarianViews({ views, isRTL }: { views: string[]; isRTL: boolean }) {
  return (
    <div>
      <SectionHeader
        icon={Scale}
        label="Contrarian Views"
        iconClassName="text-red-400"
        subtitle="Perspectives that challenge conventional thinking"
        isRTL={isRTL}
      />
      <div className="grid gap-4">
        {views.map((view, i) => (
          <div key={i} className={cn(
            "bg-card border border-border rounded-2xl shadow-[var(--shadow-1)] p-5",
            isRTL ? "border-r-4 border-r-red-500/50" : "border-l-4 border-l-red-500/50",
          )}>
            <p className={cn("text-body text-muted-foreground", isRTL && "text-right")}>{renderBoldMarkers(view)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
