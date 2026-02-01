"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Episode, Podcast, SummaryData, QuickSummaryContent } from "@/types/database";

interface InsightHeroProps {
  episode: Episode & { podcast?: Podcast };
  quickSummary?: SummaryData;
  isGenerating: boolean;
}

// Detect if text is primarily RTL
function isRTLText(text: string): boolean {
  const rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const rtlMatches = (text.match(rtlChars) || []).length;
  const latinChars = /[a-zA-Z]/g;
  const latinMatches = (text.match(latinChars) || []).length;
  return rtlMatches > latinMatches;
}

// Truncate text to a maximum length
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function InsightHero({ episode, quickSummary, isGenerating }: InsightHeroProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const content = quickSummary?.content as QuickSummaryContent | undefined;
  const isReady = quickSummary?.status === "ready" && content;
  const isProcessing = ["queued", "transcribing", "summarizing"].includes(quickSummary?.status || "");

  // Get the hook text (TL;DR or description fallback)
  const hookText = useMemo(() => {
    if (content?.tldr) return content.tldr;
    if (episode.description) return truncateText(episode.description, 250);
    return "Discover key insights from this episode.";
  }, [content?.tldr, episode.description]);

  // Detect RTL
  const isRTL = useMemo(() => {
    const textToCheck = content?.tldr || episode.description || "";
    return isRTLText(textToCheck);
  }, [content?.tldr, episode.description]);

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
        {/* Main Content */}
        <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
          {/* Processing State */}
          {isProcessing && !isReady && (
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

          {/* Hook Text */}
          {!isProcessing && (
            <>
              <p
                className={cn(
                  "text-lg md:text-xl font-medium leading-relaxed",
                  isRTL && "text-right"
                )}
              >
                {hookText}
              </p>

              {/* Expand Button - only show if we have more content */}
              {isReady && content && (content.key_takeaways?.length > 0 || content.who_is_this_for) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={cn(
                    "mt-4 gap-2 text-primary hover:text-primary",
                    isRTL && "flex-row-reverse"
                  )}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Read Full Summary
                    </>
                  )}
                </Button>
              )}

              {/* No summary fallback hint */}
              {!isReady && !isGenerating && !isProcessing && episode.description && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>Generate insights for AI-powered summary</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && isReady && content && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div
                className="px-6 pb-6 space-y-5 border-t pt-5"
                dir={isRTL ? "rtl" : "ltr"}
              >
                {/* Key Takeaways */}
                {content.key_takeaways && content.key_takeaways.length > 0 && (
                  <div className="space-y-3">
                    <h3 className={cn(
                      "text-sm font-semibold text-muted-foreground uppercase tracking-wide",
                      isRTL && "text-right"
                    )}>
                      Key Takeaways
                    </h3>
                    <ul className="space-y-2">
                      {content.key_takeaways.map((takeaway, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn(
                            "flex gap-3 items-start",
                            isRTL && "flex-row-reverse text-right"
                          )}
                        >
                          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="text-sm leading-relaxed">{takeaway}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Who is this for */}
                {content.who_is_this_for && (
                  <div className="space-y-2">
                    <h3 className={cn(
                      "text-sm font-semibold text-muted-foreground uppercase tracking-wide",
                      isRTL && "text-right"
                    )}>
                      Perfect For
                    </h3>
                    <p className={cn("text-sm leading-relaxed", isRTL && "text-right")}>
                      {content.who_is_this_for}
                    </p>
                  </div>
                )}

                {/* Topic Tags */}
                {content.topics && content.topics.length > 0 && (
                  <div className={cn("flex flex-wrap gap-2 pt-2", isRTL && "justify-end")}>
                    {content.topics.map((topic, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="gap-1 font-normal"
                      >
                        <Tag className="h-3 w-3" />
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
