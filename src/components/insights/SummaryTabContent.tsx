"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { QuickSummaryContent, DeepSummaryContent, SummaryStatus } from "@/types/database";
import { Sparkles, CheckCircle, Clock, Loader2, RefreshCw, BookOpen, Lightbulb, Users, Tag, FileText, Link2 } from "lucide-react";

// Detect if text is primarily RTL (Hebrew, Arabic, etc.)
function isRTLText(text: string): boolean {
  const rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const rtlMatches = (text.match(rtlChars) || []).length;
  const latinChars = /[a-zA-Z]/g;
  const latinMatches = (text.match(latinChars) || []).length;
  return rtlMatches > latinMatches;
}

interface SummaryTabContentProps {
  summaries: {
    quick?: { status: SummaryStatus; content?: QuickSummaryContent };
    deep?: { status: SummaryStatus; content?: DeepSummaryContent };
  };
  isLoading: boolean;
  onGenerate: (level: 'quick' | 'deep') => void;
}

export function SummaryTabContent({ summaries, isLoading, onGenerate }: SummaryTabContentProps) {
  const [activeLevel, setActiveLevel] = useState<'quick' | 'deep'>('quick');

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const currentSummary = activeLevel === 'quick' ? summaries.quick : summaries.deep;
  const isProcessing = currentSummary && ['queued', 'transcribing', 'summarizing'].includes(currentSummary.status);
  const isReady = currentSummary?.status === 'ready';
  const isFailed = currentSummary?.status === 'failed';

  return (
    <div className="space-y-4 p-4">
      {/* Level Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeLevel === 'quick' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveLevel('quick')}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Quick
          {summaries.quick?.status === 'ready' && (
            <CheckCircle className="h-3 w-3 text-green-500" />
          )}
        </Button>
        <Button
          variant={activeLevel === 'deep' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveLevel('deep')}
          className="gap-2"
        >
          <BookOpen className="h-4 w-4" />
          Deep
          {summaries.deep?.status === 'ready' && (
            <CheckCircle className="h-3 w-3 text-green-500" />
          )}
        </Button>
      </div>

      {/* Status / Generate Button */}
      {!isReady && (
        <div className="rounded-lg border p-4 text-center space-y-3">
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>
                {currentSummary?.status === 'transcribing' && 'Transcribing audio...'}
                {currentSummary?.status === 'summarizing' && 'Generating summary...'}
                {currentSummary?.status === 'queued' && 'Queued for processing...'}
              </span>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {activeLevel === 'quick'
                  ? 'Get a quick overview with key takeaways'
                  : 'Get a detailed analysis with sections and resources'}
              </p>
              <Button onClick={() => onGenerate(activeLevel)} className="gap-2">
                {isFailed ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {isFailed ? 'Retry' : `Generate ${activeLevel === 'quick' ? 'Quick' : 'Deep'} Summary`}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Quick Summary Content */}
      {isReady && activeLevel === 'quick' && summaries.quick?.content && (
        <QuickSummaryView content={summaries.quick.content} />
      )}

      {/* Deep Summary Content */}
      {isReady && activeLevel === 'deep' && summaries.deep?.content && (
        <DeepSummaryView content={summaries.deep.content} />
      )}
    </div>
  );
}

function QuickSummaryView({ content }: { content: QuickSummaryContent }) {
  // Detect RTL from content
  const isRTL = useMemo(() => {
    const allText = [content.tldr, ...content.key_takeaways, content.who_is_this_for].join(' ');
    return isRTLText(allText);
  }, [content]);

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* TL;DR */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <div className={cn("flex items-center gap-2 mb-2", isRTL && "flex-row-reverse")}>
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">TL;DR</span>
        </div>
        <p className={cn("text-sm leading-relaxed", isRTL && "text-right")}>{content.tldr}</p>
      </div>

      {/* Key Takeaways */}
      <div className="space-y-2">
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold text-sm">Key Takeaways</span>
        </div>
        <ul className="space-y-2">
          {content.key_takeaways.map((takeaway, i) => (
            <li key={i} className={cn("flex gap-2 text-sm", isRTL && "flex-row-reverse text-right")}>
              <span className="text-primary font-bold">•</span>
              <span>{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Who is this for */}
      <div className="rounded-lg border p-4">
        <div className={cn("flex items-center gap-2 mb-2", isRTL && "flex-row-reverse")}>
          <Users className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-sm">Who is this for?</span>
        </div>
        <p className={cn("text-sm text-muted-foreground", isRTL && "text-right")}>{content.who_is_this_for}</p>
      </div>

      {/* Topics */}
      <div className={cn("flex flex-wrap gap-2", isRTL && "justify-end")}>
        {content.topics.map((topic, i) => (
          <Badge key={i} variant="secondary" className="gap-1">
            <Tag className="h-3 w-3" />
            {topic}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function DeepSummaryView({ content }: { content: DeepSummaryContent }) {
  // Detect RTL from content
  const isRTL = useMemo(() => {
    const allText = [
      content.tldr,
      ...content.sections.flatMap(s => [s.title, s.summary, ...s.key_points]),
      ...content.action_prompts.flatMap(a => [a.title, a.details])
    ].join(' ');
    return isRTLText(allText);
  }, [content]);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* TL;DR */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <div className={cn("flex items-center gap-2 mb-2", isRTL && "flex-row-reverse")}>
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">TL;DR</span>
        </div>
        <p className={cn("text-sm leading-relaxed", isRTL && "text-right")}>{content.tldr}</p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <h3 className={cn("font-semibold text-sm flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <BookOpen className="h-4 w-4" />
          Sections
        </h3>
        {content.sections.map((section, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <h4 className={cn("font-medium", isRTL && "text-right")}>{section.title}</h4>
            <p className={cn("text-sm text-muted-foreground", isRTL && "text-right")}>{section.summary}</p>
            {section.key_points.length > 0 && (
              <ul className="space-y-1 mt-2">
                {section.key_points.map((point, j) => (
                  <li key={j} className={cn("flex gap-2 text-sm", isRTL && "flex-row-reverse text-right")}>
                    <span className="text-primary">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Resources */}
      {content.resources.length > 0 && (
        <div className="space-y-2">
          <h3 className={cn("font-semibold text-sm flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Link2 className="h-4 w-4" />
            Resources
          </h3>
          <div className="space-y-2">
            {content.resources.map((resource, i) => (
              <div key={i} className={cn("flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50", isRTL && "flex-row-reverse")}>
                <Badge variant="outline" className="text-xs">
                  {resource.type}
                </Badge>
                {resource.url ? (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex-1"
                  >
                    {resource.label}
                  </a>
                ) : (
                  <span className="flex-1">{resource.label}</span>
                )}
                {resource.notes && (
                  <span className="text-muted-foreground text-xs">
                    {resource.notes}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Prompts */}
      {content.action_prompts.length > 0 && (
        <div className="space-y-2">
          <h3 className={cn("font-semibold text-sm flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Action Items
          </h3>
          {content.action_prompts.map((action, i) => (
            <div key={i} className={cn(
              "rounded-lg bg-muted/30 p-3",
              isRTL ? "border-r-4 border-r-primary" : "border-l-4 border-l-primary"
            )}>
              <h4 className={cn("font-medium text-sm", isRTL && "text-right")}>{action.title}</h4>
              <p className={cn("text-sm text-muted-foreground mt-1", isRTL && "text-right")}>{action.details}</p>
            </div>
          ))}
        </div>
      )}

      {/* Topics */}
      <div className={cn("flex flex-wrap gap-2 pt-2 border-t", isRTL && "justify-end")}>
        {content.topics.map((topic, i) => (
          <Badge key={i} variant="secondary" className="gap-1">
            <Tag className="h-3 w-3" />
            {topic}
          </Badge>
        ))}
      </div>
    </div>
  );
}
