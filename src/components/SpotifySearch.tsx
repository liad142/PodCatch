"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, Loader2, Radio, Podcast } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCountry } from "@/contexts/CountryContext";

interface SearchResult {
  id: string;
  name: string;
  publisher?: string;
  image?: string;
  type: "spotify" | "rss";
}

interface SpotifySearchProps {
  className?: string;
  placeholder?: string;
}

export function SpotifySearch({
  className,
  placeholder = "Search podcasts...",
}: SpotifySearchProps) {
  const router = useRouter();
  const { country } = useCountry();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(searchQuery)}&type=show&market=${country}&limit=8`
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      const spotifyResults: SearchResult[] = (data.shows?.items || []).map(
        (show: {
          id: string;
          name: string;
          publisher: string;
          images?: { url: string }[];
        }) => ({
          id: show.id,
          name: show.name,
          publisher: show.publisher,
          image: show.images?.[0]?.url,
          type: "spotify" as const,
        })
      );

      setResults(spotifyResults);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [country]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim()) {
      setIsOpen(true);
      setIsLoading(true);
      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
    }
  };

  // Handle result selection
  const handleSelectResult = (result: SearchResult) => {
    setQuery("");
    setResults([]);
    setIsOpen(false);

    if (result.type === "spotify") {
      router.push(`/browse/show/${result.id}`);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-10 h-10 bg-secondary/50 border-0",
            "focus-visible:ring-1 focus-visible:ring-primary",
            "placeholder:text-muted-foreground/70"
          )}
          aria-label="Search podcasts"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="search-results"
          role="combobox"
        />
        {(query || isLoading) && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div
          id="search-results"
          role="listbox"
          className={cn(
            "absolute top-full left-0 right-0 mt-2 z-50",
            "bg-popover border border-border rounded-lg shadow-lg",
            "max-h-[400px] overflow-y-auto"
          )}
        >
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : results.length === 0 && query.trim() ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No podcasts found for &quot;{query}&quot;
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelectResult(result)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left transition-colors",
                  "hover:bg-accent focus:bg-accent focus:outline-none",
                  index === selectedIndex && "bg-accent",
                  index !== results.length - 1 && "border-b border-border/50"
                )}
              >
                {/* Image */}
                <div className="relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted">
                  {result.image ? (
                    <Image
                      src={result.image}
                      alt={result.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Podcast className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">
                    {result.name}
                  </p>
                  {result.publisher && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {result.publisher}
                    </p>
                  )}
                </div>

                {/* Type indicator */}
                <div className="flex-shrink-0">
                  {result.type === "spotify" ? (
                    <span className="text-xs text-green-500 font-medium">
                      Spotify
                    </span>
                  ) : (
                    <Radio className="w-4 h-4 text-primary" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
