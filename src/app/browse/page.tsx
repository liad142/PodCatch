'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Carousel } from '@/components/Carousel';
import { GenreCard, Genre } from '@/components/GenreCard';
import { PodcastGridSection } from '@/components/PodcastGridSection';
import { YouTubeSection } from '@/components/YouTubeSection';
import { ApplePodcast } from '@/components/ApplePodcastCard';
import { useCountry, COUNTRY_OPTIONS } from '@/contexts/CountryContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ApiPodcast {
  id: string;
  name: string;
  artistName: string;
  description?: string;
  artworkUrl: string;
  genres?: string[];
  trackCount?: number;
  contentAdvisoryRating?: string;
}

// Transform API podcast to component format
function transformPodcast(podcast: ApiPodcast): ApplePodcast {
  return {
    id: podcast.id,
    name: podcast.name,
    artistName: podcast.artistName,
    description: podcast.description,
    artworkUrl: podcast.artworkUrl,
    genres: podcast.genres,
    trackCount: podcast.trackCount,
    contentAdvisoryRating: podcast.contentAdvisoryRating,
  };
}

const INITIAL_PODCAST_COUNT = 30;
const LOAD_MORE_COUNT = 30;

export default function BrowsePage() {
  const { country, setCountry, countryInfo } = useCountry();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Data states
  const [genres, setGenres] = useState<Genre[]>([]);
  const [topPodcasts, setTopPodcasts] = useState<ApplePodcast[]>([]);
  const [podcastOffset, setPodcastOffset] = useState(0);
  const [hasMorePodcasts, setHasMorePodcasts] = useState(true);

  // Loading states
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingTopPodcasts, setLoadingTopPodcasts] = useState(true);

  // Error states
  const [error, setError] = useState<string | null>(null);

  // Fetch genres
  const fetchGenres = useCallback(async () => {
    setLoadingGenres(true);
    try {
      const response = await fetch('/api/apple/genres');
      if (!response.ok) throw new Error('Failed to fetch genres');
      const data = await response.json();
      setGenres(data.genres || []);
    } catch (err) {
      console.error('Error fetching genres:', err);
      setError('Failed to load genres');
    } finally {
      setLoadingGenres(false);
    }
  }, []);

  // Fetch top podcasts
  const fetchTopPodcasts = useCallback(async (reset = false) => {
    if (reset) {
      setLoadingTopPodcasts(true);
      setPodcastOffset(0);
    }
    
    try {
      const offset = reset ? 0 : podcastOffset;
      const response = await fetch(
        `/api/apple/top?country=${country.toLowerCase()}&limit=${INITIAL_PODCAST_COUNT}`
      );
      if (!response.ok) throw new Error('Failed to fetch top podcasts');
      const data = await response.json();
      const newPodcasts = (data.podcasts || []).map(transformPodcast);
      
      if (reset) {
        setTopPodcasts(newPodcasts);
      } else {
        setTopPodcasts(prev => [...prev, ...newPodcasts]);
      }
      
      // Check if there are more podcasts (iTunes RSS typically returns up to 200)
      setHasMorePodcasts(newPodcasts.length === INITIAL_PODCAST_COUNT && podcastOffset + INITIAL_PODCAST_COUNT < 200);
    } catch (err) {
      console.error('Error fetching top podcasts:', err);
      if (reset) {
        setError('Failed to load podcasts');
      }
    } finally {
      setLoadingTopPodcasts(false);
    }
  }, [country, podcastOffset]);

  // Load more podcasts
  const handleLoadMorePodcasts = async () => {
    const newOffset = podcastOffset + LOAD_MORE_COUNT;
    setPodcastOffset(newOffset);
    
    try {
      const response = await fetch(
        `/api/apple/top?country=${country.toLowerCase()}&limit=${LOAD_MORE_COUNT}`
      );
      if (!response.ok) throw new Error('Failed to load more podcasts');
      const data = await response.json();
      const newPodcasts = (data.podcasts || []).map(transformPodcast);
      
      // Filter out duplicates
      setTopPodcasts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = newPodcasts.filter((p: ApplePodcast) => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      
      setHasMorePodcasts(newPodcasts.length === LOAD_MORE_COUNT);
    } catch (err) {
      console.error('Error loading more podcasts:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  // Refetch podcasts when country changes
  useEffect(() => {
    fetchTopPodcasts(true);
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Country selector dropdown
  const handleCountrySelect = (code: string) => {
    setCountry(code);
    setIsCountryDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCountryDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-country-selector]')) {
          setIsCountryDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCountryDropdownOpen]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/20 via-primary/5 to-transparent py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Discover
              </h1>
              <p className="mt-2 text-muted-foreground text-lg">
                Explore top podcasts and trending videos from around the world
              </p>
            </div>

            {/* Country Selector + Theme Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative" data-country-selector>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 h-auto text-sm"
                    aria-expanded={isCountryDropdownOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="text-base">{countryInfo?.flag}</span>
                    <span className="hidden sm:inline">{countryInfo?.name}</span>
                    <motion.div
                      animate={{ rotate: isCountryDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.div>
                  </Button>
                </motion.div>

                {isCountryDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    role="listbox"
                    className="absolute top-full right-0 mt-1 z-[9999] w-56 max-h-64 overflow-y-auto rounded-lg border bg-popover shadow-lg"
                  >
                    {COUNTRY_OPTIONS.map((option) => (
                      <motion.button
                        key={option.code}
                        role="option"
                        aria-selected={option.code === country}
                        onClick={() => handleCountrySelect(option.code)}
                        whileHover={{ backgroundColor: 'var(--accent)' }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          option.code === country && 'bg-accent'
                        )}
                      >
                        <span className="text-lg">{option.flag}</span>
                        <span className="text-sm">{option.name}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
                aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-12">
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-center">
            {error}
          </div>
        )}

        {/* Genres Carousel - Unchanged */}
        <Carousel
          title="Browse Genres"
          items={genres}
          isLoading={loadingGenres}
          itemCount={18}
          renderItem={(genre) => <GenreCard genre={genre} />}
          keyExtractor={(genre) => genre.id}
          itemClassName="w-40"
          skeletonClassName="w-40 h-24"
        />

        {/* Top Podcasts Grid Section - NEW */}
        <PodcastGridSection
          title={`Top Podcasts in ${countryInfo?.name || 'Your Region'}`}
          subtitle={`${countryInfo?.flag} Discover the most popular shows`}
          podcasts={topPodcasts}
          isLoading={loadingTopPodcasts}
          initialCount={INITIAL_PODCAST_COUNT}
          showLoadMore={hasMorePodcasts && topPodcasts.length >= INITIAL_PODCAST_COUNT}
          onLoadMore={handleLoadMorePodcasts}
        />

        {/* YouTube Section - NEW */}
        <YouTubeSection
          initialTab="trending"
          itemsPerPage={12}
        />
      </div>
    </div>
  );
}
