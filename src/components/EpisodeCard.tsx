"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SummaryStatusBadge } from "./SummaryStatusBadge";
import type { EpisodeWithSummary, SummaryStatus } from "@/types/database";
import { Calendar, Clock, FileText, Sparkles, Loader2, RefreshCw, Eye } from "lucide-react";

interface EpisodeCardProps {
  episode: EpisodeWithSummary;
  showSummaryButton?: boolean;
  summaryStatus?: SummaryStatus | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getButtonConfig(hasSummary: boolean, summaryStatus?: SummaryStatus | null) {
  // Check if processing
  const isProcessing = summaryStatus && ['queued', 'transcribing', 'summarizing'].includes(summaryStatus);
  const isFailed = summaryStatus === 'failed';
  const isReady = summaryStatus === 'ready' || hasSummary;

  if (isProcessing) {
    return {
      text: 'Summarizing...',
      icon: Loader2,
      variant: 'secondary' as const,
      spin: true,
    };
  }

  if (isFailed) {
    return {
      text: 'Retry',
      icon: RefreshCw,
      variant: 'destructive' as const,
      spin: false,
    };
  }

  if (isReady) {
    return {
      text: 'View Summary',
      icon: Eye,
      variant: 'secondary' as const,
      spin: false,
    };
  }

  // Default: not ready
  return {
    text: 'Summarize',
    icon: Sparkles,
    variant: 'default' as const,
    spin: false,
  };
}

export function EpisodeCard({ episode, showSummaryButton = true, summaryStatus }: EpisodeCardProps) {
  const hasSummary = !!episode.summary;
  const effectiveStatus = summaryStatus ?? episode.summaryStatus ?? null;
  const buttonConfig = getButtonConfig(hasSummary, effectiveStatus);
  const ButtonIcon = buttonConfig.icon;

  // Determine if we should show the processing badge instead of the "Summary Available" badge
  const isProcessing = effectiveStatus && ['queued', 'transcribing', 'summarizing'].includes(effectiveStatus);
  const showSummaryAvailable = hasSummary && !isProcessing;

  return (
    <Card className="group transition-all hover:shadow-md hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {showSummaryAvailable && (
                <Badge variant="default" className="shrink-0">
                  <FileText className="mr-1 h-3 w-3" />
                  Summary Available
                </Badge>
              )}
              {isProcessing && (
                <SummaryStatusBadge status={effectiveStatus} size="sm" />
              )}
              {effectiveStatus === 'failed' && (
                <SummaryStatusBadge status={effectiveStatus} size="sm" />
              )}
            </div>
            <Link href={`/episode/${episode.id}`}>
              <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors cursor-pointer">
                {episode.title}
              </h3>
            </Link>
            {episode.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {episode.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              {episode.published_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(episode.published_at)}
                </span>
              )}
              {episode.duration_seconds && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(episode.duration_seconds)}
                </span>
              )}
            </div>
          </div>
          {showSummaryButton && (
            <div className="shrink-0">
              <Link href={`/episode/${episode.id}/insights`}>
                <Button
                  variant={buttonConfig.variant}
                  size="sm"
                  disabled={isProcessing ?? false}
                >
                  <ButtonIcon className={`mr-2 h-4 w-4 ${buttonConfig.spin ? 'animate-spin' : ''}`} />
                  {buttonConfig.text}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
