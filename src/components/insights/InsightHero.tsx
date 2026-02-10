"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles, Loader2, Tag, BookOpen, Lightbulb, Clock, MessageSquareQuote, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isRTLText } from "@/lib/rtl";
import type { Episode, Podcast, SummaryData, QuickSummaryContent, DeepSummaryContent } from "@/types/database";

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

  // Get gradient color from podcast image (simplified - uses CSS filter approach)
  const gradientStyle = useMemo(() => {
    // Default gradient
    return {
      background: "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.02) 100%)",
    };
  }, []);

  return (
    <div className="px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border overflow-hidden"
        style={gradientStyle}
      >
        {/* Main Content - Quick Summary */}
        <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
          {/* Processing State */}
          {isProcessing && !isQuickReady && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Generating summary...</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {isGenerating && !quickSummary && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          )}

          {/* Quick Summary Content */}
          {!isProcessing && (
            <>
              {/* Hook Headline */}
              {isQuickReady && quickContent.hook_headline && (
                <h2 className={cn(
                  "text-xl md:text-2xl font-bold mb-3",
                  isRTL && "text-right"
                )}>
                  {quickContent.hook_headline}
                </h2>
              )}

              {/* Executive Brief */}
              <p
                className={cn(
                  "text-base md:text-lg leading-relaxed text-muted-foreground",
                  isRTL && "text-right"
                )}
              >
                {hookText}
              </p>

              {/* Golden Nugget */}
              {isQuickReady && quickContent.golden_nugget && (
                <div className={cn(
                  "mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800",
                  isRTL ? "border-r-4 border-r-yellow-500" : "border-l-4 border-l-yellow-500"
                )}>
                  <div className={cn("flex items-center gap-2 mb-1", isRTL && "flex-row-reverse")}>
                    <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <span className="text-xs font-semibold text-yellow-900 dark:text-yellow-100 uppercase tracking-wide">Golden Nugget</span>
                  </div>
                  <p className={cn("text-sm italic", isRTL && "text-right")}>
                    {quickContent.golden_nugget}
                  </p>
                </div>
              )}

              {/* Perfect For & Tags */}
              {isQuickReady && (quickContent.perfect_for || (quickContent.tags && quickContent.tags.length > 0)) && (
                <div className={cn("mt-4 flex flex-wrap items-center gap-2", isRTL && "flex-row-reverse")}>
                  {quickContent.perfect_for && (
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {quickContent.perfect_for}
                    </Badge>
                  )}
                  {quickContent.tags?.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Show Deep Summary Button */}
              {(isDeepReady || isProcessing) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeepSummary(!showDeepSummary)}
                  className={cn(
                    "mt-4 gap-2 text-primary hover:text-primary",
                    isRTL && "flex-row-reverse"
                  )}
                >
                  {showDeepSummary ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Hide Full Analysis
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      Show Full Analysis
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}

              {/* No summary fallback hint */}
              {!isQuickReady && !isGenerating && !isProcessing && episode.description && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>Generate insights for AI-powered summary</span>
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
              className="overflow-hidden"
            >
              <div
                className="px-6 pb-6 space-y-6 border-t pt-6"
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
                    {/* Comprehensive Overview */}
                    {deepContent.comprehensive_overview && (
                      <div className="space-y-3">
                        <h3 className={cn(
                          "text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <BookOpen className="h-4 w-4" />
                          Comprehensive Overview
                        </h3>
                        <div className={cn("prose prose-sm dark:prose-invert max-w-none", isRTL && "text-right")}>
                          {deepContent.comprehensive_overview.split('\n').map((paragraph, i) => (
                            <p key={i} className="mb-3 last:mb-0 leading-relaxed">{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Core Concepts */}
                    {deepContent.core_concepts && deepContent.core_concepts.length > 0 && (
                      <div className="space-y-3">
                        <h3 className={cn(
                          "text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Core Concepts
                        </h3>
                        <div className="space-y-3">
                          {deepContent.core_concepts.map((concept, i) => (
                            <div key={i} className="rounded-lg border p-4 space-y-2 bg-card">
                              <h4 className={cn("font-semibold text-primary", isRTL && "text-right")}>
                                {concept.concept}
                              </h4>
                              <p className={cn("text-sm text-muted-foreground leading-relaxed", isRTL && "text-right")}>
                                {concept.explanation}
                              </p>
                              {concept.quote_reference && (
                                <blockquote className={cn(
                                  "border-l-4 border-primary/30 pl-4 italic text-sm mt-2",
                                  isRTL && "border-l-0 border-r-4 pr-4 pl-0 text-right"
                                )}>
                                  &ldquo;{concept.quote_reference}&rdquo;
                                </blockquote>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chronological Breakdown */}
                    {deepContent.chronological_breakdown && deepContent.chronological_breakdown.length > 0 && (
                      <div className="space-y-3">
                        <h3 className={cn(
                          "text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <Clock className="h-4 w-4" />
                          Episode Flow
                        </h3>
                        <div className="space-y-3">
                          {deepContent.chronological_breakdown.map((section, i) => (
                            <div key={i} className="rounded-lg bg-muted/30 p-4 space-y-2">
                              <Badge variant="outline" className="text-xs">
                                {section.timestamp_description}
                              </Badge>
                              <p className={cn("text-sm leading-relaxed", isRTL && "text-right")}>
                                {section.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contrarian Views */}
                    {deepContent.contrarian_views && deepContent.contrarian_views.length > 0 && (
                      <div className="space-y-3">
                        <h3 className={cn(
                          "text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <MessageSquareQuote className="h-4 w-4 text-purple-500" />
                          Contrarian Views & Insights
                        </h3>
                        <div className="space-y-2">
                          {deepContent.contrarian_views.map((view, i) => (
                            <div key={i} className={cn(
                              "rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-3",
                              isRTL ? "border-r-4 border-r-purple-500" : "border-l-4 border-l-purple-500"
                            )}>
                              <p className={cn("text-sm", isRTL && "text-right")}>{view}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actionable Takeaways */}
                    {deepContent.actionable_takeaways && deepContent.actionable_takeaways.length > 0 && (
                      <div className="space-y-3">
                        <h3 className={cn(
                          "text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Actionable Takeaways
                        </h3>
                        <div className="space-y-2">
                          {deepContent.actionable_takeaways.map((action, i) => (
                            <div key={i} className={cn(
                              "rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-3",
                              isRTL ? "border-r-4 border-r-green-500" : "border-l-4 border-l-green-500"
                            )}>
                              <div className={cn("flex gap-2 items-start", isRTL && "flex-row-reverse text-right")}>
                                <span className="text-green-600 dark:text-green-400 font-bold text-sm">{i + 1}.</span>
                                <p className="text-sm flex-1">{action}</p>
                              </div>
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
