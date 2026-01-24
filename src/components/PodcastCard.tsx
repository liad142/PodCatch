"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Podcast } from "@/types/database";
import { Mic2 } from "lucide-react";

interface PodcastCardProps {
  podcast: Podcast & { episode_count?: number };
}

export function PodcastCard({ podcast }: PodcastCardProps) {
  return (
    <Link href={`/podcast/${podcast.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
        <CardHeader className="p-0">
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            {podcast.image_url ? (
              <Image
                src={podcast.image_url}
                alt={podcast.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Mic2 className="h-16 w-16 text-primary/40" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {podcast.title}
          </h3>
          {podcast.author && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {podcast.author}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {podcast.episode_count !== undefined && (
              <Badge variant="secondary">
                {podcast.episode_count} episode{podcast.episode_count !== 1 ? "s" : ""}
              </Badge>
            )}
            {podcast.language && (
              <Badge variant="outline">{podcast.language.toUpperCase()}</Badge>
            )}
          </div>
          {podcast.description && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {podcast.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
