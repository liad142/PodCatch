"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyShowCard, SpotifyShow, SpotifyShowCardSkeleton } from "@/components/SpotifyShowCard";
import { useCountry } from "@/contexts/CountryContext";
import { cn } from "@/lib/utils";

interface ApiShow {
  id: string;
  name: string;
  publisher: string;
  description: string;
  imageUrl: string | null;
  totalEpisodes: number;
  explicit: boolean;
  spotifyUrl: string;
}

// Transform API show to component format
function transformShow(show: ApiShow): SpotifyShow {
  return {
    id: show.id,
    name: show.name,
    publisher: show.publisher,
    description: show.description,
    images: show.imageUrl ? [{ url: show.imageUrl }] : [],
    total_episodes: show.totalEpisodes,
    external_urls: { spotify: show.spotifyUrl },
  };
}

// Category display info with gradients
const CATEGORY_INFO: Record<string, { gradient: string; description: string }> = {
  comedy: {
    gradient: "from-yellow-500 to-orange-500",
    description: "Laugh out loud with the best comedy podcasts",
  },
  news: {
    gradient: "from-blue-500 to-cyan-500",
    description: "Stay informed with top news and current affairs",
  },
  true_crime: {
    gradient: "from-red-600 to-rose-500",
    description: "Explore gripping true crime stories and investigations",
  },
  society_and_culture: {
    gradient: "from-purple-500 to-pink-500",
    description: "Deep dives into society, culture, and human stories",
  },
  sports: {
    gradient: "from-green-500 to-emerald-500",
    description: "All the sports coverage you need",
  },
  health_and_fitness: {
    gradient: "from-teal-500 to-green-500",
    description: "Improve your wellness with health and fitness podcasts",
  },
  arts: {
    gradient: "from-fuchsia-500 to-purple-500",
    description: "Explore creativity and artistic expression",
  },
  business: {
    gradient: "from-slate-600 to-zinc-500",
    description: "Insights and advice for entrepreneurs and professionals",
  },
  education: {
    gradient: "from-indigo-500 to-blue-500",
    description: "Learn something new every day",
  },
  technology: {
    gradient: "from-gray-600 to-slate-500",
    description: "Stay on top of tech news and innovations",
  },
  default: {
    gradient: "from-primary to-primary/70",
    description: "Discover the best podcasts in this category",
  },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CategoryPage({ params }: PageProps) {
  const { id: categoryId } = use(params);
  const { country } = useCountry();

  const [shows, setShows] = useState<SpotifyShow[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const categoryInfo = CATEGORY_INFO[categoryId] || CATEGORY_INFO.default;

  // Fetch shows for category
  const fetchShows = useCallback(
    async (currentOffset: number, append: boolean = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await fetch(
          `/api/spotify/categories/${categoryId}/shows?market=${country}&limit=${limit}&offset=${currentOffset}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Category not found");
          }
          throw new Error("Failed to fetch shows");
        }

        const data = await response.json();
        const transformedShows = (data.shows || []).map(transformShow);

        if (append) {
          setShows((prev) => [...prev, ...transformedShows]);
        } else {
          setShows(transformedShows);
          setCategoryName(data.category?.name || categoryId);
        }

        setHasMore(transformedShows.length === limit);
        setError(null);
      } catch (err) {
        console.error("Error fetching category shows:", err);
        setError(err instanceof Error ? err.message : "Failed to load shows");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [categoryId, country]
  );

  // Initial fetch
  useEffect(() => {
    setOffset(0);
    fetchShows(0, false);
  }, [fetchShows]);

  // Load more handler
  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const newOffset = offset + limit;
      setOffset(newOffset);
      fetchShows(newOffset, true);
    }
  };

  // Format category name for display
  const displayName =
    categoryName ||
    categoryId
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section
        className={cn(
          "relative overflow-hidden py-12 sm:py-16",
          "bg-gradient-to-br",
          categoryInfo.gradient
        )}
      >
        <div className="container mx-auto px-4">
          {/* Back button */}
          <Link href="/browse" className="inline-block mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Browse
            </Button>
          </Link>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white drop-shadow-md">
            {displayName}
          </h1>
          <p className="mt-2 text-white/80 text-lg max-w-xl">
            {categoryInfo.description}
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-black/10 rounded-full blur-2xl" />
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-destructive text-lg mb-4">{error}</p>
            <Button onClick={() => fetchShows(0, false)}>Try Again</Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <SpotifyShowCardSkeleton key={i} />
            ))}
          </div>
        ) : shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-lg">
              No podcasts found in this category
            </p>
          </div>
        ) : (
          <>
            {/* Shows Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {shows.map((show, index) => (
                <SpotifyShowCard
                  key={show.id}
                  show={show}
                  priority={index < 10}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="min-w-[150px]"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
