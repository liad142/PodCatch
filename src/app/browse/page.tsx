"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel } from "@/components/Carousel";
import { CategoryCard, Category } from "@/components/CategoryCard";
import { SpotifyShowCard, SpotifyShow } from "@/components/SpotifyShowCard";
import { useCountry, COUNTRY_OPTIONS } from "@/contexts/CountryContext";
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

interface ApiCategory {
  id: string;
  name: string;
  iconUrl: string | null;
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

// Transform API category to component format
function transformCategory(cat: ApiCategory): Category {
  return {
    id: cat.id,
    name: cat.name,
    icon: undefined, // Icons come from CSS gradients
  };
}

export default function BrowsePage() {
  const { country, setCountry, countryInfo } = useCountry();
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [topShows, setTopShows] = useState<SpotifyShow[]>([]);
  const [categoryShows, setCategoryShows] = useState<Record<string, SpotifyShow[]>>({});

  // Loading states
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTopShows, setLoadingTopShows] = useState(true);
  const [loadingCategoryShows, setLoadingCategoryShows] = useState<Record<string, boolean>>({});

  // Error states
  const [error, setError] = useState<string | null>(null);

  // Featured categories to show carousels for
  const featuredCategoryIds = ["comedy", "news", "true_crime", "technology", "business"];

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const response = await fetch(`/api/spotify/categories?market=${country}`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories((data.categories || []).map(transformCategory));
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  }, [country]);

  // Fetch top shows
  const fetchTopShows = useCallback(async () => {
    setLoadingTopShows(true);
    try {
      const response = await fetch(`/api/spotify/shows/top?market=${country}&limit=20`);
      if (!response.ok) throw new Error("Failed to fetch top shows");
      const data = await response.json();
      setTopShows((data.shows || []).map(transformShow));
    } catch (err) {
      console.error("Error fetching top shows:", err);
    } finally {
      setLoadingTopShows(false);
    }
  }, [country]);

  // Fetch shows for a category
  const fetchCategoryShows = useCallback(async (categoryId: string) => {
    setLoadingCategoryShows((prev) => ({ ...prev, [categoryId]: true }));
    try {
      const response = await fetch(
        `/api/spotify/categories/${categoryId}/shows?market=${country}&limit=20`
      );
      if (!response.ok) throw new Error("Failed to fetch category shows");
      const data = await response.json();
      setCategoryShows((prev) => ({
        ...prev,
        [categoryId]: (data.shows || []).map(transformShow),
      }));
    } catch (err) {
      console.error(`Error fetching shows for ${categoryId}:`, err);
    } finally {
      setLoadingCategoryShows((prev) => ({ ...prev, [categoryId]: false }));
    }
  }, [country]);

  // Initial data fetch
  useEffect(() => {
    fetchCategories();
    fetchTopShows();
  }, [fetchCategories, fetchTopShows]);

  // Fetch category shows when categories load
  useEffect(() => {
    if (categories.length > 0) {
      const existingCategoryIds = categories.map((c) => c.id);
      featuredCategoryIds
        .filter((id) => existingCategoryIds.includes(id))
        .forEach((categoryId) => {
          fetchCategoryShows(categoryId);
        });
    }
  }, [categories, fetchCategoryShows]);

  // Country selector dropdown
  const handleCountrySelect = (code: string) => {
    setCountry(code);
    setIsCountryDropdownOpen(false);
  };

  // Get category name by id
  const getCategoryName = (id: string): string => {
    const category = categories.find((c) => c.id === id);
    return category?.name || id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/20 via-primary/5 to-transparent py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Discover Podcasts
              </h1>
              <p className="mt-2 text-muted-foreground text-lg">
                Explore top podcasts from around the world
              </p>
            </div>

            {/* Country Selector */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="flex items-center gap-2 min-w-[180px] justify-between"
                aria-expanded={isCountryDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{countryInfo?.flag}</span>
                  <span>{countryInfo?.name}</span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isCountryDropdownOpen && "rotate-180"
                  )}
                />
              </Button>

              {isCountryDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute top-full right-0 mt-2 z-50 w-56 max-h-64 overflow-y-auto rounded-lg border bg-popover shadow-lg"
                >
                  {COUNTRY_OPTIONS.map((option) => (
                    <button
                      key={option.code}
                      role="option"
                      aria-selected={option.code === country}
                      onClick={() => handleCountrySelect(option.code)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors",
                        option.code === country && "bg-accent"
                      )}
                    >
                      <span className="text-lg">{option.flag}</span>
                      <span className="text-sm">{option.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-10">
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-center">
            {error}
          </div>
        )}

        {/* Categories Carousel */}
        <Carousel
          title="Browse Categories"
          items={categories}
          isLoading={loadingCategories}
          itemCount={12}
          seeAllHref="/browse/categories"
          renderItem={(category) => <CategoryCard category={category} />}
          keyExtractor={(category) => category.id}
          itemClassName="w-40"
          skeletonClassName="w-40 h-24"
        />

        {/* Top Podcasts Carousel */}
        <Carousel
          title={`Top Podcasts in ${countryInfo?.name || "Your Region"}`}
          items={topShows}
          isLoading={loadingTopShows}
          itemCount={12}
          renderItem={(show, index) => (
            <SpotifyShowCard show={show} priority={index < 4} />
          )}
          keyExtractor={(show) => show.id}
          itemClassName="w-[160px] sm:w-[180px]"
          skeletonClassName="w-[160px] sm:w-[180px] h-[240px]"
        />

        {/* Category-specific Carousels */}
        {featuredCategoryIds
          .filter((id) => categories.some((c) => c.id === id))
          .map((categoryId) => (
            <Carousel
              key={categoryId}
              title={`Top in ${getCategoryName(categoryId)}`}
              items={categoryShows[categoryId] || []}
              isLoading={loadingCategoryShows[categoryId] ?? true}
              itemCount={12}
              seeAllHref={`/browse/category/${categoryId}`}
              renderItem={(show) => <SpotifyShowCard show={show} />}
              keyExtractor={(show) => show.id}
              itemClassName="w-[160px] sm:w-[180px]"
              skeletonClassName="w-[160px] sm:w-[180px] h-[240px]"
            />
          ))}
      </div>
    </div>
  );
}
