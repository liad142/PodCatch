"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles, Loader2, Tag, BookOpen, Lightbulb, Clock, MessageSquareQuote, Play, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isRTLText } from "@/lib/rtl";
import { useAudioPlayerSafe } from "@/contexts/AudioPlayerContext";
import { parseHighlightMarkers, normalizeChronologicalSections, hasRealTimestamps } from "@/lib/summary-normalize";
import type { Episode, Podcast, SummaryData, QuickSummaryContent, DeepSummaryContent, ChronologicalSection } from "@/types/database";

interface InsightHeroProps {
  episode: Episode & { podcast?: Podcast };
  quickSummary?: SummaryData;
  deepSummary?: SummaryData;
  isGenerating: boolean;
}

// Truncate text to a maximum length
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

// Render paragraph with <<highlighted>> markers
function AnnotatedParagraph({ text, isRTL }: { text: string; isRTL: boolean }) {
  const segments = parseHighlightMarkers(text);
  return (
    <p className={cn("mb-3 last:mb-0 leading-relaxed", isRTL && "text-right")}>
      {segments.map((seg, i) =>
        seg.type === "highlight" ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-400/30 dark:text-yellow-200 px-0.5 rounded text-yellow-900"
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

// Episode Chapters Timeline component
function EpisodeChapters({
  sections,
  isRTL,
}: {
  sections: ChronologicalSection[];
  isRTL: boolean;
}) {
  const normalized = useMemo(() => normalizeChronologicalSections(sections), [sections]);
  const showTimestamps = useMemo(() => hasRealTimestamps(normalized), [normalized]);
  const [expandedIndex, setExpandedIndex] = useState<number>(0); // First auto-expanded
  const [allExpanded, setAllExpanded] = useState(false);
  const player = useAudioPlayerSafe();

  // Find active chapter based on current playback time
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
    if (seconds >= 0 && player) {
      player.seek(seconds);
      if (!player.isPlaying) {
        player.play();
      }
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
    setAllExpanded(false);
  };

  const toggleAll = () => {
    setAllExpanded(!allExpanded);
    if (allExpanded) {
      setExpandedIndex(0);
    }
  };

  if (normalized.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between",
        isRTL && "flex-row-reverse"
      )}>
        <h3 className={cn(
          "text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2",
          isRTL && "flex-row-reverse"
        )}>
          <Clock className="h-4 w-4" />
          Episode Chapters
        </h3>
        {normalized.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="text-xs gap-1 h-7 text-muted-foreground"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="h-3 w-3" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronsUpDown className="h-3 w-3" />
                Expand All
              </>
            )}
          </Button>
        )}
      </div>

      {/* Timeline list */}
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className={cn(
          "relative",
          isRTL
            ? "border-r-2 border-slate-200 dark:border-white/10"
            : "border-l-2 border-slate-200 dark:border-white/10"
        )}
      >
        {normalized.map((section, i) => {
          const isActive = i === activeIndex;
          const isExpanded = allExpanded || expandedIndex === i;
          const sectionTitle = section.title || section.timestamp_description || `Section ${i + 1}`;
          const hasTimestamp = showTimestamps && (section.timestamp_seconds ?? 0) > 0;

          return (
            <div key={i} className="relative">
              {/* Timeline dot — anchored to the line edge */}
              <div className={cn(
                "absolute top-3.5 w-2.5 h-2.5 rounded-full z-10 transition-colors",
                isRTL ? "-right-[7px]" : "-left-[7px]",
                isActive
                  ? "bg-primary ring-2 ring-primary/30"
                  : "bg-slate-300 dark:bg-white/20"
              )} />

              {/* Clickable row */}
              <button
                onClick={() => toggleExpand(i)}
                className={cn(
                  "w-full p-2.5 rounded-lg transition-colors",
                  "hover:bg-slate-50 dark:hover:bg-white/5",
                  isRTL ? "pr-4 text-right" : "pl-4 text-left",
                  isActive && "bg-primary/5"
                )}
              >
                {/* Timestamp + Title — tight, inline */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hasTimestamp && (
                    <span
                      role="button"
                      className={cn(
                        "text-xs font-mono tabular-nums px-2 py-0.5 rounded-full cursor-pointer transition-colors shrink-0",
                        isActive
                          ? "bg-primary/15 text-primary font-semibold"
                          : "bg-slate-100 dark:bg-white/10 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeekTo(section.timestamp_seconds!);
                      }}
                    >
                      {section.timestamp}~
                    </span>
                  )}
                  <span className={cn(
                    "font-semibold text-sm",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {sectionTitle}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider shrink-0">
                      Playing
                    </span>
                  )}
                  {/* Chevron: only when collapsed */}
                  {!isExpanded && (
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground shrink-0",
                      isRTL ? "mr-auto" : "ml-auto"
                    )} />
                  )}
                </div>

                {/* Summary teaser (collapsed only) */}
                {!isExpanded && section.hook && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
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
                      "pb-3 space-y-2",
                      isRTL ? "pr-4" : "pl-4"
                    )}>
                      {section.hook && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                          {section.hook}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed text-foreground">
                        {section.content}
                      </p>
                      {hasTimestamp && (
                        <div className="pt-1">
                          <Button
                            variant="outline"
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

export function InsightHero({ episode, quickSummary, deepSummary, isGenerating }: InsightHeroProps) {
  const [showDeepSummary, setShowDeepSummary] = useState(false);

  const quickContent = quickSummary?.content as QuickSummaryContent | undefined;
  const deepContent = deepSummary?.content as DeepSummaryContent | undefined;

  const isQuickReady = quickSummary?.status === "ready" && quickContent;
  const isDeepReady = deepSummary?.status === "ready" && deepContent;
  const isProcessing = ["queued", "transcribing", "summarizing"].includes(quickSummary?.status || "") ||
    ["queued", "transcribing", "summarizing"].includes(deepSummary?.status || "");

  // Get the hook text (executive_brief or hook_headline or description fallback)
  const hookText = useMemo(() => {
    if (quickContent?.executive_brief) return quickContent.executive_brief;
    if (quickContent?.hook_headline) return quickContent.hook_headline;
    if (episode.description) return truncateText(episode.description, 250);
    return "Discover key insights from this episode.";
  }, [quickContent?.executive_brief, quickContent?.hook_headline, episode.description]);

  // Detect RTL
  const isRTL = useMemo(() => {
    const textToCheck = quickContent?.executive_brief || quickContent?.hook_headline ||
      deepContent?.comprehensive_overview || episode.description || "";
    return isRTLText(textToCheck);
  }, [quickContent?.executive_brief, quickContent?.hook_headline, deepContent?.comprehensive_overview, episode.description]);

  return (
    <div className="px-4 md:px-0 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card rounded-3xl shadow-sm overflow-hidden relative"
      >
        {/* Main Content - Quick Summary */}
        <div className="p-8 md:p-10 relative" dir={isRTL ? "rtl" : "ltr"}>
          {/* Processing State */}
          {isProcessing && !isQuickReady && (
            <div className="flex items-center gap-3 text-muted-foreground mb-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Generating summary...</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {isGenerating && !quickSummary && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 bg-muted" />
              <Skeleton className="h-4 w-full bg-muted" />
              <Skeleton className="h-4 w-5/6 bg-muted" />
            </div>
          )}

          {/* Quick Summary Content */}
          {!isProcessing && (
            <>
              {/* Hook Headline */}
              {isQuickReady && quickContent.hook_headline && (
                <h2 className={cn(
                  "text-2xl md:text-3xl font-bold mb-6 text-foreground tracking-tight",
                  isRTL && "text-right"
                )}>
                  {quickContent.hook_headline}
                </h2>
              )}

              {/* Executive Brief */}
              <p
                className={cn(
                  "text-lg leading-relaxed text-card-foreground/90 font-serif", // Using font-serif for book-like feel if available, or just keeping default sans but relaxed
                  isRTL && "text-right"
                )}
              >
                {hookText}
              </p>

              {/* Golden Nugget */}
              {isQuickReady && quickContent.golden_nugget && (
                <div className={cn(
                  "mt-8 p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40",
                  isRTL ? "border-r-4 border-r-amber-400 dark:border-r-amber-600" : "border-l-4 border-l-amber-400 dark:border-l-amber-600"
                )}>
                  <div className={cn("flex items-center gap-2 mb-2", isRTL && "flex-row-reverse")}>
                    <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Golden Nugget</span>
                  </div>
                  <p className={cn("text-base italic text-foreground/90 font-medium", isRTL && "text-right")}>
                    &ldquo;{quickContent.golden_nugget}&rdquo;
                  </p>
                </div>
              )}

              {/* Perfect For & Tags */}
              {isQuickReady && (quickContent.perfect_for || (quickContent.tags && quickContent.tags.length > 0)) && (
                <div className={cn("mt-6 flex flex-wrap items-center gap-2", isRTL && "flex-row-reverse")}>
                  {quickContent.perfect_for && (
                    <Badge variant="secondary" className="gap-1.5 py-1 px-3 bg-muted text-muted-foreground hover:bg-muted/80">
                      <Tag className="h-3 w-3" />
                      {quickContent.perfect_for}
                    </Badge>
                  )}
                  {quickContent.tags?.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-border text-muted-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Show Deep Summary Button */}
              {(isDeepReady || isProcessing) && (
                <div className={cn(
                  "mt-8 flex justify-center sticky bottom-0 pt-12 -mx-10 px-10 pb-4 bg-gradient-to-t from-card via-card to-transparent",
                  showDeepSummary ? "relative pt-8 bg-none" : ""
                )}>
                  <button
                    onClick={() => setShowDeepSummary(!showDeepSummary)}
                    className="group flex flex-col items-center gap-1 text-primary hover:text-primary/80 transition-colors focus:outline-none"
                  >
                    <span className="text-sm font-semibold tracking-wide uppercase flex items-center gap-2">
                      {showDeepSummary ? "Less Analysis" : "Show Full Analysis"}
                    </span>
                    {showDeepSummary ? (
                      <ChevronUp className="h-5 w-5 animate-bounce-slow" />
                    ) : (
                      <ChevronDown className="h-5 w-5 group-hover:translate-y-1 transition-transform" />
                    )}
                  </button>
                </div>
              )}

            </>
          )}
        </div>

        {/* Deep Summary Expanded Content */}
        <AnimatePresence>
          {showDeepSummary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden bg-muted/20"
            >
              <div
                className="px-8 pb-10 space-y-8 border-t border-border pt-8"
                dir={isRTL ? "rtl" : "ltr"}
              >
                {/* Processing indicator for Deep Summary */}
                {!isDeepReady && isProcessing && (
                  <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Generating deep analysis...</span>
                  </div>
                )}

                {isDeepReady && deepContent && (
                  <>
                    {/* Comprehensive Overview with Highlights */}
                    {deepContent.comprehensive_overview && (
                      <div className="space-y-4">
                        <h3 className={cn(
                          "text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <BookOpen className="h-4 w-4 text-primary" />
                          Comprehensive Overview
                        </h3>
                        <div className={cn("prose prose-lg dark:prose-invert text-card-foreground/90 max-w-none leading-relaxed", isRTL && "text-right")}>
                          {deepContent.comprehensive_overview.split('\n').map((paragraph, i) => (
                            <AnnotatedParagraph key={i} text={paragraph} isRTL={isRTL} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Core Concepts */}
                    {deepContent.core_concepts && deepContent.core_concepts.length > 0 && (
                      <div className="space-y-4">
                        <h3 className={cn(
                          "text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <Lightbulb className="h-4 w-4 text-primary" />
                          Core Concepts
                        </h3>
                        <div className="grid gap-4">
                          {deepContent.core_concepts.map((concept, i) => (
                            <div key={i} className="bg-background/50 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none p-6 border border-border">
                              <h4 className={cn("font-bold text-foreground mb-2 flex items-center gap-2", isRTL && "text-right flex-row-reverse")}>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Lightbulb className="h-4 w-4 text-primary" />
                                </div>
                                {concept.concept}
                              </h4>
                              <p className={cn("text-muted-foreground leading-relaxed", isRTL && "text-right")}>
                                {concept.explanation}
                              </p>
                              {concept.quote_reference && (
                                <div className={cn(
                                  "mt-3 pl-4 border-l-2 border-primary/20 italic text-muted-foreground/80 text-sm",
                                  isRTL && "border-l-0 border-r-2 pr-4 pl-0 text-right"
                                )}>
                                  &ldquo;{concept.quote_reference}&rdquo;
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Episode Chapters (replaces old Chronological Breakdown) */}
                    {deepContent.chronological_breakdown && deepContent.chronological_breakdown.length > 0 && (
                      <EpisodeChapters
                        sections={deepContent.chronological_breakdown}
                        isRTL={isRTL}
                      />
                    )}

                    {/* Contrarian Views */}
                    {deepContent.contrarian_views && deepContent.contrarian_views.length > 0 && (
                      <div className="space-y-4">
                        <h3 className={cn(
                          "text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <MessageSquareQuote className="h-4 w-4 text-violet-500" />
                          Contrarian Views
                        </h3>
                        <div className="grid gap-4">
                          {deepContent.contrarian_views.map((view, i) => (
                            <div key={i} className={cn(
                              "bg-card rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] dark:shadow-none p-6 border border-border/50 flex items-start gap-4",
                              isRTL && "flex-row-reverse"
                            )}>
                              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                                <MessageSquareQuote className="h-4 w-4 text-destructive" />
                              </div>
                              <p className={cn("text-card-foreground/90 leading-relaxed", isRTL && "text-right")}>{view}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
