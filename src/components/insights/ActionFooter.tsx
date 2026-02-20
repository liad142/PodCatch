"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookmarkPlus,
  CheckCircle2,
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
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { normalizeActionItems, getResourceSearchUrl } from "@/lib/summary-normalize";
import type { Episode, Podcast, ActionItem } from "@/types/database";

interface ActionFooterProps {
  episode: Episode & { podcast?: Podcast };
  actionPrompts?: (string | ActionItem)[];
  summaryReady?: boolean;
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

export function ActionFooter({ episode, actionPrompts, summaryReady = false }: ActionFooterProps) {
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
          <h2 className="text-lg font-semibold text-foreground mb-1">What&apos;s next?</h2>
          <p className="text-sm text-muted-foreground">
            Continue exploring or take action on what you&apos;ve learned
          </p>
        </div>

        {/* Secondary Actions - REMOVED (Replaced by QuickShare and SubscriptionCard) */}
        {/* 
        <div className="grid grid-cols-2 gap-4">
           ...
        </div>
        */}

        {/* Structured Action Items */}
        {sortedActions.length > 0 && (
          <div className="bg-card rounded-3xl shadow-sm border border-border dark:border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                Action Items
              </h3>
              <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">
                {checkedItems.size}/{sortedActions.length} done
              </span>
            </div>

            <div className="space-y-1">
              {visibleActions.map((action, displayIndex) => {
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
                      "group py-4 border-b border-border last:border-0 transition-all",
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
                          <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 group-hover:border-violet-400 transition-colors" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Header: category + title + priority */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="gap-1 text-[10px] uppercase tracking-wider bg-muted text-muted-foreground font-medium border-0">
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
                            "text-base text-card-foreground leading-relaxed font-medium",
                            isChecked && "line-through text-muted-foreground"
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
                                    "bg-muted border border-border text-muted-foreground hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 hover:border-violet-200 dark:hover:border-violet-800 transition-all"
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
                className="w-full gap-2 text-muted-foreground hover:text-foreground hover:bg-muted mt-2"
              >
                <ChevronDown className="h-4 w-4" />
                Show {hiddenCount} more
              </Button>
            )}
          </div>
        )}

      </motion.div>

    </div>
  );
}
