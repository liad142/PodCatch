"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Episode, Podcast } from "@/types/database";

interface ActionFooterProps {
  episode: Episode & { podcast?: Podcast };
  actionPrompts?: string[];
}

export function ActionFooter({ episode, actionPrompts }: ActionFooterProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  // Toggle action item
  const toggleItem = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
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
      } catch (err) {
        // User cancelled or error
        console.log("Share cancelled");
      }
    } else {
      handleCopyLink();
    }
  };

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
              // Placeholder for AI chat feature
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
                // Placeholder for save feature
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

        {/* Action Items from Deep Summary */}
        {actionPrompts && actionPrompts.length > 0 && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Action Items
              </h3>
              <span className="text-xs text-muted-foreground">
                {checkedItems.size}/{actionPrompts.length} done
              </span>
            </div>

            <div className="space-y-2">
              {actionPrompts.map((action, i) => {
                const isChecked = checkedItems.has(i);

                return (
                  <motion.button
                    key={i}
                    onClick={() => toggleItem(i)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      "hover:bg-muted/50",
                      isChecked && "bg-primary/5 border-primary/20"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {isChecked ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm leading-relaxed",
                            isChecked && "line-through text-muted-foreground"
                          )}
                        >
                          {action}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Progress bar */}
            {actionPrompts.length > 0 && (
              <div className="pt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(checkedItems.size / actionPrompts.length) * 100}%`,
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
