"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  BookmarkPlus,
  Share2,
  MessageSquare,
  CheckCircle2,
  Circle,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Wrench,
  GitBranch,
  Lightbulb,
  Target,
  BookOpen,
  Repeat,
  Github,
  User,
  FileText,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { normalizeActionItems, getResourceSearchUrl } from "@/lib/summary-normalize";
import type { Episode, Podcast, ActionItem } from "@/types/database";

interface ActionFooterProps {
  episode: Episode & { podcast?: Podcast };
  actionPrompts?: (string | ActionItem)[];
}

// Category icon mapping
function getCategoryIcon(category: string) {
  switch (category) {
    case "tool":
      return Wrench;
    case "repo":
      return GitBranch;
    case "concept":
      return Lightbulb;
    case "strategy":
      return Target;
    case "resource":
      return BookOpen;
    case "habit":
      return Repeat;
    default:
      return Lightbulb;
  }
}

// Category label
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    tool: "Tool",
    repo: "Repository",
    concept: "Concept",
    strategy: "Strategy",
    resource: "Resource",
    habit: "Habit",
  };
  return labels[category] || "Insight";
}

// Priority styling
function getPriorityStyles(priority?: string) {
  switch (priority) {
    case "high":
      return {
        label: "High priority",
        className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      };
    case "low":
      return {
        label: "Quick win",
        className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
    default:
      return null; // medium = no pill
  }
}

// Resource type icon
function getResourceIcon(type: string) {
  switch (type) {
    case "github":
      return Github;
    case "book":
      return BookOpen;
    case "tool":
      return Wrench;
    case "person":
      return User;
    case "paper":
      return FileText;
    case "website":
      return Globe;
    default:
      return ExternalLink;
  }
}

// localStorage key for checked state
function getStorageKey(episodeId: string) {
  return `podcatch:actions:${episodeId}`;
}

export function ActionFooter({ episode, actionPrompts }: ActionFooterProps) {
  const actions = useMemo(() => normalizeActionItems(actionPrompts), [actionPrompts]);

  // Sort: high priority first, then medium, then low
  const sortedActions = useMemo(() => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...actions].sort(
      (a, b) => (priorityOrder[a.priority || "medium"] ?? 1) - (priorityOrder[b.priority || "medium"] ?? 1)
    );
  }, [actions]);

  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load checked state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(episode.id));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCheckedItems(new Set(parsed));
        }
      }
    } catch {
      // ignore
    }
  }, [episode.id]);

  // Save checked state to localStorage
  const toggleItem = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
    try {
      localStorage.setItem(
        getStorageKey(episode.id),
        JSON.stringify([...newChecked])
      );
    } catch {
      // ignore
    }
  };

  // Share handlers
  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: episode.title,
          text: `Check out this podcast episode: ${episode.title}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  const INITIAL_SHOW = 3;
  const visibleActions = showAll ? sortedActions : sortedActions.slice(0, INITIAL_SHOW);
  const hiddenCount = sortedActions.length - INITIAL_SHOW;

  return (
    <div className="px-4 md:px-0 max-w-3xl mx-auto pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">What&apos;s next?</h2>
          <p className="text-sm text-slate-500">
            Continue exploring or take action on what you&apos;ve learned
          </p>
        </div>

        {/* Secondary Actions - Grid (Moved up since Ask AI is floating) */}
        <div className="grid grid-cols-2 gap-4">
          {/* Save to Library */}
          <Button
            variant="outline"
            size="lg"
            className="h-16 flex-col gap-1.5 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm rounded-2xl"
            onClick={() => {
              alert("Save feature coming soon!");
            }}
          >
            <BookmarkPlus className="h-5 w-5 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">Save to Library</span>
          </Button>

          {/* Share */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="h-16 flex-col gap-1.5 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm rounded-2xl">
                <Share2 className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-medium text-slate-600">Share Insight</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy link"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNativeShare} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Share...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Structured Action Items */}
        {sortedActions.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-600" />
                Action Items
              </h3>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {checkedItems.size}/{sortedActions.length} done
              </span>
            </div>

            <div className="space-y-1">
              {visibleActions.map((action, displayIndex) => {
                // Find the actual index in sortedActions for checkbox persistence
                const actualIndex = sortedActions.indexOf(action);
                const isChecked = checkedItems.has(actualIndex);
                const CategoryIcon = getCategoryIcon(action.category);
                const priorityStyles = getPriorityStyles(action.priority);

                return (
                  <motion.div
                    key={actualIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: displayIndex * 0.05 }}
                    className={cn(
                      "group py-4 border-b border-slate-100 last:border-0 transition-all",
                      isChecked && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleItem(actualIndex)}
                        className="shrink-0 mt-1 transition-transform active:scale-95"
                      >
                        {isChecked ? (
                          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-violet-600" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-violet-400 transition-colors" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Header: category + title + priority */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="gap-1 text-[10px] uppercase tracking-wider bg-slate-100 text-slate-500 font-medium border-0">
                            {getCategoryLabel(action.category)}
                          </Badge>
                          {priorityStyles && (
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] h-5 px-1.5 shrink-0 uppercase tracking-wider border-0 font-medium", priorityStyles.className)}
                            >
                              {priorityStyles.label}
                            </Badge>
                          )}
                        </div>

                        {/* Action text */}
                        <p
                          className={cn(
                            "text-base text-slate-700 leading-relaxed font-medium",
                            isChecked && "line-through text-slate-400"
                          )}
                        >
                          {action.text}
                        </p>

                        {/* Resource pills */}
                        {action.resources && action.resources.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {action.resources.map((resource, ri) => {
                              const ResourceIcon = getResourceIcon(resource.type);
                              return (
                                <a
                                  key={ri}
                                  href={getResourceSearchUrl(resource)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                                    "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all"
                                  )}
                                  title={resource.context || `Search for ${resource.name}`}
                                >
                                  <ResourceIcon className="h-3 w-3" />
                                  {resource.name}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Show more button */}
            {hiddenCount > 0 && !showAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
                className="w-full gap-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 mt-2"
              >
                <ChevronDown className="h-4 w-4" />
                Show {hiddenCount} more
              </Button>
            )}
          </div>
        )}

        {/* Podcast Info Card */}
        {episode.podcast && (
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              {episode.podcast.image_url && (
                <img
                  src={episode.podcast.image_url}
                  alt={episode.podcast.title || "Podcast"}
                  className="w-14 h-14 rounded-xl object-cover shadow-sm bg-slate-100"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">
                  {episode.podcast.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {episode.podcast.author || "Podcast"}
                </p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full px-4 border-slate-200 text-slate-600" asChild>
                <a href={`/podcast/${episode.podcast_id}`}>View Show</a>
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Floating Ask AI Input Bar */}
      <div className="fixed bottom-6 left-4 right-4 z-50 pointer-events-none flex justify-center">
        <div className="pointer-events-auto w-full max-w-xl">
          <div
            className="bg-white rounded-full shadow-2xl p-2 pl-6 flex items-center gap-3 border border-slate-100 cursor-text group transition-transform hover:scale-[1.01]"
            onClick={() => alert("AI Chat feature coming soon!")}
          >
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full p-1.5 shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 text-slate-400 text-sm font-medium truncate">
              Ask anything about this episode...
            </div>
            <Button size="icon" className="rounded-full w-10 h-10 bg-slate-900 text-white hover:bg-slate-800 shrink-0 shadow-lg">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
