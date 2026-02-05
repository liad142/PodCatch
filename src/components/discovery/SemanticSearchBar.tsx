'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { ApplePodcast } from '@/components/ApplePodcastCard';
import { glass } from '@/lib/glass';
import Image from 'next/image';
import Link from 'next/link';

interface SemanticSearchBarProps {
  podcasts: ApplePodcast[];
}

interface SearchResult {
  podcast: ApplePodcast;
  reason: string;
}

const AI_REASONS = [
  'Matches your interest in',
  'Popular for learning about',
  'Highly rated for',
  'Recommended for exploring',
  'Great introduction to',
];

export function SemanticSearchBar({ podcasts }: SemanticSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || podcasts.length === 0) return;

    setIsSearching(true);
    setShowResults(true);

    // Simulate AI thinking delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Filter podcasts by query (simple keyword match for demo)
    const queryLower = query.toLowerCase();
    const matched = podcasts
      .filter(p =>
        p.name.toLowerCase().includes(queryLower) ||
        p.artistName.toLowerCase().includes(queryLower) ||
        p.genres?.some(g => g.toLowerCase().includes(queryLower))
      )
      .slice(0, 5)
      .map(podcast => ({
        podcast,
        reason: `${AI_REASONS[Math.floor(Math.random() * AI_REASONS.length)]} "${query}"`,
      }));

    // If no matches, return random "suggestions"
    if (matched.length === 0) {
      const random = podcasts
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(podcast => ({
          podcast,
          reason: `You might also enjoy this based on "${query}"`,
        }));
      setResults(random);
    } else {
      setResults(matched);
    }

    setIsSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="What do you want to learn today?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className={`pl-12 pr-12 h-12 text-base rounded-full transition-all ${glass.input}`}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 ${glass.card}`}
          >
            {isSearching ? (
              <div className="p-6 flex items-center justify-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                </motion.div>
                <span className="text-muted-foreground">Finding the best podcasts for you...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  AI Picks for "{query}"
                </div>
                {results.map((result) => (
                  <Link
                    key={result.podcast.id}
                    href={`/browse/podcast/${result.podcast.id}`}
                    onClick={() => setShowResults(false)}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={result.podcast.artworkUrl?.replace('100x100', '200x200') || '/placeholder-podcast.png'}
                        alt={result.podcast.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.podcast.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{result.reason}</p>
                    </div>
                    <Sparkles className="h-4 w-4 text-primary/50 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No results found. Try a different search term.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
