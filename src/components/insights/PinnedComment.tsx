"use client";

import { Pin, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinnedCommentProps {
  comment: {
    author: string;
    text: string;
    likeCount: string;
  };
  isRTL: boolean;
}

export function PinnedComment({ comment, isRTL }: PinnedCommentProps) {
  if (!comment.text) return null;

  return (
    <div>
      <div className={cn("flex items-center gap-2 mb-5", isRTL && "flex-row-reverse")}>
        <h2 className={cn("text-h2 text-foreground flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Pin className="h-5 w-5 text-red-400" />
          Pinned Comment
        </h2>
      </div>

      <div className={cn(
        "bg-card border border-border rounded-2xl shadow-[var(--shadow-1)] p-5",
        isRTL ? "border-r-4 border-r-red-400/50" : "border-l-4 border-l-red-400/50"
      )}>
        <div className={cn("flex items-center gap-2 mb-3", isRTL && "flex-row-reverse")}>
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-xs font-bold text-foreground">
              {comment.author.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground">{comment.author}</span>
          <Pin className="h-3 w-3 text-red-400" />
        </div>

        <p className={cn(
          "text-body text-muted-foreground whitespace-pre-line",
          isRTL && "text-right"
        )}>
          {comment.text}
        </p>

        {comment.likeCount && comment.likeCount !== "0" && (
          <div className={cn("flex items-center gap-1.5 mt-3 text-muted-foreground/60", isRTL && "flex-row-reverse")}>
            <ThumbsUp className="h-3.5 w-3.5" />
            <span className="text-xs">{comment.likeCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
