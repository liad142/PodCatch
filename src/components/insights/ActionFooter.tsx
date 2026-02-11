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
    <div className="px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">What&apos;s next?</h2>
          <p className="text-sm text-muted-foreground">
            Continue exploring or take action on what you&apos;ve learned
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-3">
          {/* Ask AI - Primary Action */}
          <Button
            size="lg"
            className="w-full gap-3 h-14 text-base"
            onClick={() => {
              alert("AI Chat feature coming soon!");
            }}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold">Ask AI about this episode</div>
              <div className="text-xs opacity-80">
                &ldquo;What did they say about...&rdquo;
              </div>
            </div>
            <Sparkles className="h-5 w-5 opacity-60" />
          </Button>

          {/* Secondary Actions - Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Save to Library */}
            <Button
              variant="outline"
              size="lg"
              className="h-14 flex-col gap-1"
              onClick={() => {
                alert("Save feature coming soon!");
              }}
            >
              <BookmarkPlus className="h-5 w-5" />
              <span className="text-xs">Save to Library</span>
            </Button>

            {/* Share */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="h-14 flex-col gap-1">
                  <Share2 className="h-5 w-5" />
                  <span className="text-xs">Share Insight</span>
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
        </div>

        {/* Structured Action Items */}
        {sortedActions.length > 0 && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Action Items
              </h3>
              <span className="text-xs text-muted-foreground">
                {checkedItems.size}/{sortedActions.length} done
              </span>
            </div>

            <div className="space-y-3">
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
                      "rounded-lg border p-3 transition-all",
                      isChecked && "bg-primary/5 border-primary/20 opacity-70"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleItem(actualIndex)}
                        className="shrink-0 mt-0.5"
                      >
                        {isChecked ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Header: category + title + priority */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                            <CategoryIcon className="h-3 w-3" />
                            {getCategoryLabel(action.category)}
                          </Badge>
                          {priorityStyles && (
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] h-5 px-1.5 shrink-0", priorityStyles.className)}
                            >
                              {priorityStyles.label}
                            </Badge>
                          )}
                        </div>

                        {/* Action text */}
                        <p
                          className={cn(
                            "text-sm leading-relaxed",
                            isChecked && "line-through text-muted-foreground"
                          )}
                        >
                          {action.text}
                        </p>

                        {/* Resource pills */}
                        {action.resources && action.resources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {action.resources.map((resource, ri) => {
                              const ResourceIcon = getResourceIcon(resource.type);
                              return (
                                <a
                                  key={ri}
                                  href={getResourceSearchUrl(resource)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs",
                                    "border bg-muted/50 hover:bg-muted transition-colors",
                                    "text-foreground hover:text-primary"
                                  )}
                                  title={resource.context || `Search for ${resource.name}`}
                                >
                                  <ResourceIcon className="h-3 w-3" />
                                  {resource.name}
                                  <ExternalLink className="h-2.5 w-2.5 opacity-50" />
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
                className="w-full gap-2 text-muted-foreground"
              >
                <ChevronDown className="h-4 w-4" />
                Show {hiddenCount} more
              </Button>
            )}

            {/* Progress bar */}
            {sortedActions.length > 0 && (
              <div className="pt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(checkedItems.size / sortedActions.length) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Podcast Info Card */}
        {episode.podcast && (
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              {episode.podcast.image_url && (
                <img
                  src={episode.podcast.image_url}
                  alt={episode.podcast.title || "Podcast"}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {episode.podcast.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {episode.podcast.author || "Podcast"}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/podcast/${episode.podcast_id}`}>View Show</a>
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
