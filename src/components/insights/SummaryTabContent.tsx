"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { QuickSummaryContent, DeepSummaryContent, SummaryStatus } from "@/types/database";
import { Sparkles, CheckCircle, Clock, Loader2, RefreshCw, BookOpen, Lightbulb, Users, Tag, FileText, Link2 } from "lucide-react";

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
  return (
    <div className="space-y-4">
      {/* TL;DR */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">TL;DR</span>
        </div>
        <p className="text-sm leading-relaxed">{content.tldr}</p>
      </div>

      {/* Key Takeaways */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold text-sm">Key Takeaways</span>
        </div>
        <ul className="space-y-2">
          {content.key_takeaways.map((takeaway, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-primary font-bold">•</span>
              <span>{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Who is this for */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-sm">Who is this for?</span>
        </div>
        <p className="text-sm text-muted-foreground">{content.who_is_this_for}</p>
      </div>

      {/* Topics */}
      <div className="flex flex-wrap gap-2">
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
  return (
    <div className="space-y-6">
      {/* TL;DR */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">TL;DR</span>
        </div>
        <p className="text-sm leading-relaxed">{content.tldr}</p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Sections
        </h3>
        {content.sections.map((section, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <h4 className="font-medium">{section.title}</h4>
            <p className="text-sm text-muted-foreground">{section.summary}</p>
            {section.key_points.length > 0 && (
              <ul className="space-y-1 mt-2">
                {section.key_points.map((point, j) => (
                  <li key={j} className="flex gap-2 text-sm">
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
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Resources
          </h3>
          <div className="space-y-2">
            {content.resources.map((resource, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50">
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
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Action Items
          </h3>
          {content.action_prompts.map((action, i) => (
            <div key={i} className="rounded-lg border-l-4 border-l-primary bg-muted/30 p-3">
              <h4 className="font-medium text-sm">{action.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{action.details}</p>
            </div>
          ))}
        </div>
      )}

      {/* Topics */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
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
