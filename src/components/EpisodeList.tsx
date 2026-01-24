"use client";

import { EpisodeCard } from "./EpisodeCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { EpisodeWithSummary } from "@/types/database";

interface EpisodeListProps {
  episodes: EpisodeWithSummary[];
  isLoading?: boolean;
}

export function EpisodeList({ episodes, isLoading }: EpisodeListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-full max-w-md" />
                <Skeleton className="h-4 w-full max-w-lg" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No episodes found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {episodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </div>
  );
}
