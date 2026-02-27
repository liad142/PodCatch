'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import posthog from 'posthog-js';
import Image from 'next/image';
import Link from 'next/link';
import { X, Play, Clock, Lightbulb, Loader2, Target, Tag, Headphones, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import type { QuickSummaryContent, DeepSummaryContent, ChronologicalSection } from '@/types/database';

interface SummaryModalProps {
  episodeId: string;
  title: string;
  podcastName: string;
  podcastArtwork: string;
  audioUrl: string;
  durationSeconds: number | null;
  podcastId: string;
  summaries: { quick?: any; deep?: any };
  onClose: () => void;
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return url.startsWith('/');
  }
}

function hasRealTimestamps(sections: ChronologicalSection[]): boolean {
  return sections.some(s => (s.timestamp_seconds ?? 0) > 0);
}

export function SummaryModal({
  episodeId,
  title,
  podcastName,
  podcastArtwork,
  audioUrl,
  durationSeconds,
  podcastId,
  summaries,
  onClose,
}: SummaryModalProps) {
  const player = useAudioPlayer();
  const { user, setShowAuthModal } = useAuth();
  const [fetchedQuick, setFetchedQuick] = useState<QuickSummaryContent | null>(null);
  const [fetchedDeep, setFetchedDeep] = useState<DeepSummaryContent | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const fetchedRef = useRef(false);

  const artwork = isValidImageUrl(podcastArtwork) ? podcastArtwork : '';

  // Use summary data directly from props when available
  const hasPropsData = !!(summaries?.quick || summaries?.deep);
  const quickSummary = (summaries?.quick as QuickSummaryContent) || fetchedQuick;
  const deepSummary = (summaries?.deep as DeepSummaryContent) || fetchedDeep;

  // Fallback fetch if props have no summary data (stale cache)
  useEffect(() => {
    if (hasPropsData || fetchedRef.current) return;
    fetchedRef.current = true;
    setIsFetching(true);

    fetch(`/api/episodes/${episodeId}/insights`)
      .then(res => res.json())
      .then(data => {
        if (data.summaries?.quick?.content) setFetchedQuick(data.summaries.quick.content);
        if (data.summaries?.deep?.content) setFetchedDeep(data.summaries.deep.content);
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, [episodeId, hasPropsData]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Build track with chapters
  const track = useMemo(() => {
    const sections = deepSummary?.chronological_breakdown;
    let chapters: { title: string; timestamp: string; timestamp_seconds: number }[] | undefined;

    if (sections && hasRealTimestamps(sections)) {
      chapters = sections
        .filter(s => (s.timestamp_seconds ?? 0) >= 0 && s.timestamp)
        .map(s => ({
          title: s.title || 'Untitled',
          timestamp: s.timestamp!,
          timestamp_seconds: s.timestamp_seconds!,
        }));
    }

    return {
      id: episodeId,
      title,
      artist: podcastName,
      artworkUrl: artwork,
      audioUrl,
      duration: durationSeconds ?? undefined,
      chapters,
      podcastId,
      source: 'daily_mix_modal',
    };
  }, [episodeId, title, podcastName, artwork, audioUrl, durationSeconds, podcastId, deepSummary]);

  const handlePlay = useCallback(() => {
    posthog.capture('summary_modal_play_clicked', { episode_id: episodeId, podcast_name: podcastName });
    player.play(track);
    if (!user) {
      // Close modal and show auth prompt for AI player
      onClose();
      setShowAuthModal(true, 'Sign up to unlock the AI Player with smart chapters, speed controls, and more.');
    }
  }, [player, track, user, onClose, setShowAuthModal]);

  const isCurrentlyPlaying = player.currentTrack?.id === episodeId && player.isPlaying;

  const chapters = useMemo(() => {
    if (!deepSummary?.chronological_breakdown?.length) return [];
    if (!hasRealTimestamps(deepSummary.chronological_breakdown)) return [];
    return deepSummary.chronological_breakdown.filter(
      s => (s.timestamp_seconds ?? 0) >= 0 && s.timestamp
    );
  }, [deepSummary]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
            aria-label="Close summary"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {/* Header with artwork background */}
            <div className="relative px-6 pt-6 pb-5">
              {/* Blurred artwork background */}
              {artwork && (
                <div className="absolute inset-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artwork}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-20"
                  />
                  <div className="absolute inset-0 bg-background/70" />
                </div>
              )}

              <div className="relative flex items-start gap-4">
                {artwork && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-border flex-shrink-0 shadow-lg">
                    <Image
                      src={artwork}
                      alt={podcastName}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm text-muted-foreground truncate">{podcastName}</p>
                  <h2 className="text-lg font-bold text-foreground line-clamp-2 leading-snug mt-1">
                    {title}
                  </h2>
                  {durationSeconds ? (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(durationSeconds / 60)} min
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Play button */}
              <div className="relative mt-4">
                <Button
                  onClick={handlePlay}
                  className="gap-2 rounded-full px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  size="lg"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {isCurrentlyPlaying ? 'Playing' : 'Play Episode'}
                </Button>
              </div>

              {/* AI Player upsell for non-authenticated users */}
              {!user && (
                <div className="relative mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Headphones className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <button
                      onClick={() => { onClose(); setShowAuthModal(true, 'Sign up to unlock the AI Player with smart chapters and insights.'); }}
                      className="text-primary font-medium hover:underline cursor-pointer"
                    >
                      Sign up
                    </button>
                    {' '}to unlock the AI Player with chapters
                  </span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Summary content */}
            <div className={`px-6 py-5 space-y-6 ${player.currentTrack ? 'pb-32' : ''}`}>
              {isFetching && !quickSummary && !deepSummary ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading summary...</p>
                </div>
              ) : (
                <>
                  {/* Quick Summary */}
                  {quickSummary ? (
                    <>
                      {/* Headline */}
                      <div>
                        <h3 className="text-xl font-bold text-foreground leading-snug">
                          {quickSummary.hook_headline}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {quickSummary.executive_brief}
                        </p>
                      </div>

                      {/* Golden Nugget */}
                      {quickSummary.golden_nugget && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4">
                          <div className="flex items-start gap-2.5">
                            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Golden Nugget</p>
                              <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                                {quickSummary.golden_nugget}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Perfect For + Tags */}
                      <div className="flex flex-wrap gap-3">
                        {quickSummary.perfect_for && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Target className="h-3.5 w-3.5" />
                            <span>{quickSummary.perfect_for}</span>
                          </div>
                        )}
                        {quickSummary.tags?.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                            {quickSummary.tags.slice(0, 5).map((tag) => (
                              <span
                                key={tag}
                                className="inline-block px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : deepSummary ? (
                    <>
                      {/* Fallback: deep summary overview when no quick summary */}
                      {deepSummary.comprehensive_overview && (
                        <div>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                            {deepSummary.comprehensive_overview.replace(/<<(.*?)>>/g, '$1')}
                          </p>
                        </div>
                      )}

                      {/* Top 3 takeaways */}
                      {deepSummary.actionable_takeaways && deepSummary.actionable_takeaways.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-green-500" />
                            <h4 className="text-sm font-semibold text-foreground">Key Takeaways</h4>
                          </div>
                          <ul className="space-y-1.5">
                            {deepSummary.actionable_takeaways.slice(0, 3).map((item, i) => (
                              <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">&#8226;</span>
                                <span className="line-clamp-2">{typeof item === 'string' ? item : item.text}</span>
                              </li>
                            ))}
                          </ul>
                          {deepSummary.actionable_takeaways.length > 3 && (
                            <p className="text-xs text-muted-foreground mt-1.5 ml-4">
                              +{deepSummary.actionable_takeaways.length - 3} more
                            </p>
                          )}
                        </div>
                      )}

                      {/* Core concepts as tags */}
                      {deepSummary.core_concepts && deepSummary.core_concepts.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          {deepSummary.core_concepts.slice(0, 5).map((concept, i) => (
                            <span
                              key={i}
                              className="inline-block px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground"
                            >
                              {concept.concept}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}

                  {/* CTA to full insights with deep summary stats */}
                  <div className="pt-2 border-t border-border">
                    <Link
                      href={`/episode/${episodeId}/insights`}
                      onClick={onClose}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors group cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">Explore Full Insights</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[
                            chapters.length > 0 && `${chapters.length} chapters`,
                            deepSummary?.core_concepts?.length && `${deepSummary.core_concepts.length} key concepts`,
                            deepSummary?.actionable_takeaways?.length && 'action items',
                            'transcript',
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
