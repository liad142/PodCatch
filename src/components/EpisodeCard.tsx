"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SummaryStatusBadge } from "./SummaryStatusBadge";
import { SummarizeButton } from "./SummarizeButton";
import type { EpisodeWithSummary, SummaryStatus } from "@/types/database";
import { Calendar, Clock, FileText } from "lucide-react";

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

export function EpisodeCard({ episode, showSummaryButton = true, summaryStatus }: EpisodeCardProps) {
  const hasSummary = !!episode.summary;
  const effectiveStatus = summaryStatus ?? episode.summaryStatus ?? null;

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
              <SummarizeButton
                episodeId={episode.id}
                initialStatus={effectiveStatus === 'ready' || hasSummary ? 'ready' : effectiveStatus === 'failed' ? 'failed' : 'not_ready'}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
