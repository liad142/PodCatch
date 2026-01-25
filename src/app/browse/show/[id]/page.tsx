"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, Loader2, Podcast } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotifyEpisodeCard, SpotifyEpisode, SpotifyEpisodeCardSkeleton } from "@/components/SpotifyEpisodeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountry } from "@/contexts/CountryContext";
import { cn } from "@/lib/utils";

interface ApiShow {
  id: string;
  name: string;
  publisher: string;
  description: string;
  htmlDescription: string;
  imageUrl: string | null;
  images: { url: string; width?: number; height?: number }[];
  totalEpisodes: number;
  explicit: boolean;
  languages: string[];
  spotifyUrl: string;
}

interface ApiEpisode {
  id: string;
  name: string;
  description: string;
  htmlDescription: string;
  durationMs: number;
  releaseDate: string;
  explicit: boolean;
  imageUrl: string | null;
  audioPreviewUrl: string | null;
  spotifyUrl: string;
}

// Transform API episode to component format
function transformEpisode(episode: ApiEpisode): SpotifyEpisode {
  return {
    id: episode.id,
    name: episode.name,
    description: episode.description,
    release_date: episode.releaseDate,
    duration_ms: episode.durationMs,
    images: episode.imageUrl ? [{ url: episode.imageUrl }] : [],
    external_urls: { spotify: episode.spotifyUrl },
    html_description: episode.htmlDescription,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ShowPage({ params }: PageProps) {
  const { id: showId } = use(params);
  const { country } = useCountry();

  const [show, setShow] = useState<ApiShow | null>(null);
  const [episodes, setEpisodes] = useState<SpotifyEpisode[]>([]);
  const [isLoadingShow, setIsLoadingShow] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const limit = 20;

  // Fetch show details
  const fetchShow = useCallback(async () => {
    setIsLoadingShow(true);
    try {
      const response = await fetch(
        `/api/spotify/shows/${showId}?market=${country}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Podcast not found");
        }
        throw new Error("Failed to fetch podcast");
      }

      const data = await response.json();
      setShow(data.show);
      setError(null);
    } catch (err) {
      console.error("Error fetching show:", err);
      setError(err instanceof Error ? err.message : "Failed to load podcast");
    } finally {
      setIsLoadingShow(false);
    }
  }, [showId, country]);

  // Fetch episodes
  const fetchEpisodes = useCallback(
    async (currentOffset: number, append: boolean = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoadingEpisodes(true);
      }

      try {
        const response = await fetch(
          `/api/spotify/shows/${showId}/episodes?market=${country}&limit=${limit}&offset=${currentOffset}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch episodes");
        }

        const data = await response.json();
        const transformedEpisodes = (data.episodes || []).map(transformEpisode);

        if (append) {
          setEpisodes((prev) => [...prev, ...transformedEpisodes]);
        } else {
          setEpisodes(transformedEpisodes);
        }

        setTotalEpisodes(data.total || 0);
        setHasMore(data.hasNext);
      } catch (err) {
        console.error("Error fetching episodes:", err);
      } finally {
        setIsLoadingEpisodes(false);
        setIsLoadingMore(false);
      }
    },
    [showId, country]
  );

  // Initial fetch
  useEffect(() => {
    fetchShow();
    setOffset(0);
    fetchEpisodes(0, false);
  }, [fetchShow, fetchEpisodes]);

  // Load more handler
  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const newOffset = offset + limit;
      setOffset(newOffset);
      fetchEpisodes(newOffset, true);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoadingEpisodes) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById("load-more-sentinel");
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoadingEpisodes, offset]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Podcast className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-destructive text-lg mb-4">{error}</p>
        <div className="flex gap-4">
          <Link href="/browse">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Browse
            </Button>
          </Link>
          <Button onClick={fetchShow}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="relative bg-gradient-to-b from-primary/20 via-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-8">
          {/* Back button */}
          <Link href="/browse" className="inline-block mb-6">
            <Button variant="ghost" size="sm" className="hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Browse
            </Button>
          </Link>

          {/* Show Info */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Cover Image */}
            <div className="flex-shrink-0">
              {isLoadingShow ? (
                <Skeleton className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-lg shadow-xl" />
              ) : (
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-lg overflow-hidden shadow-xl bg-muted">
                  {show?.imageUrl ? (
                    <Image
                      src={show.imageUrl}
                      alt={show.name}
                      fill
                      sizes="(max-width: 640px) 192px, (max-width: 768px) 224px, 256px"
                      priority
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Podcast className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Show Details */}
            <div className="flex-1 min-w-0">
              {isLoadingShow ? (
                <>
                  <Skeleton className="h-5 w-20 mb-2" />
                  <Skeleton className="h-10 w-3/4 mb-3" />
                  <Skeleton className="h-5 w-1/3 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-6" />
                  <Skeleton className="h-10 w-40" />
                </>
              ) : show ? (
                <>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                    Podcast
                  </p>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 line-clamp-3">
                    {show.name}
                  </h1>
                  <p className="text-lg text-muted-foreground mb-3">
                    {show.publisher}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">
                      {totalEpisodes || show.totalEpisodes} episodes
                    </Badge>
                    {show.explicit && (
                      <Badge variant="outline">Explicit</Badge>
                    )}
                    {show.languages?.length > 0 && (
                      <Badge variant="outline">
                        {show.languages[0].toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground line-clamp-4 mb-6 max-w-2xl">
                    {show.description}
                  </p>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={show.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="bg-[#1DB954] hover:bg-[#1ed760] text-black">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Listen on Spotify
                      </Button>
                    </a>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Episodes Section */}
      <section className="container mx-auto px-4 py-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">
          All Episodes
          {totalEpisodes > 0 && (
            <span className="text-muted-foreground font-normal ml-2">
              ({totalEpisodes})
            </span>
          )}
        </h2>

        {isLoadingEpisodes ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <SpotifyEpisodeCardSkeleton key={i} />
            ))}
          </div>
        ) : episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No episodes available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => (
              <SpotifyEpisodeCard
                key={episode.id}
                episode={episode}
                showImage={show?.imageUrl || undefined}
                onClick={() => {
                  // Open in Spotify
                  if (episode.external_urls?.spotify) {
                    window.open(episode.external_urls.spotify, "_blank");
                  }
                }}
              />
            ))}

            {/* Load More Sentinel for infinite scroll */}
            {hasMore && (
              <div
                id="load-more-sentinel"
                className="flex justify-center py-8"
              >
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading more episodes...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
