"use client";

import { Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAskAI } from "@/contexts/AskAIContext";
import { useAudioPlayerSafe } from "@/contexts/AudioPlayerContext";

/**
 * Ask AI bar with two visual modes:
 * - standalone: floating pill at the bottom (when player is NOT active)
 * - integrated: compact dark row inside the StickyAudioPlayer
 */
export function AskAIBar({ mode }: { mode: "standalone" | "integrated" }) {
  const { active } = useAskAI();
  const player = useAudioPlayerSafe();
  const playerActive = !!(player && player.currentTrack);

  // Standalone: only show when on insights page AND player is NOT active
  if (mode === "standalone") {
    if (!active || playerActive) return null;

    return (
      <div className="fixed bottom-6 left-4 right-4 z-50 pointer-events-none flex justify-center">
        <div className="pointer-events-auto w-full max-w-xl">
          <div
            className="bg-card/90 backdrop-blur-md dark:bg-muted/90 rounded-full shadow-2xl p-2 pl-6 flex items-center gap-3 border border-border cursor-text group transition-transform hover:scale-[1.01]"
            onClick={() => alert("AI Chat feature coming soon!")}
          >
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full p-1.5 shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 text-muted-foreground text-sm font-medium truncate">
              Ask anything about this episode...
            </div>
            <Button
              size="icon"
              className="rounded-full w-10 h-10 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-lg"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Integrated: only show when on insights page AND player IS active
  if (!active) return null;

  return (
    <div
      className="px-4 py-2 border-b border-white/5 flex items-center gap-3 cursor-text hover:bg-white/[0.02] transition-colors"
      onClick={() => alert("AI Chat feature coming soon!")}
    >
      <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full p-1 shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex-1 text-white/50 text-sm truncate">
        Ask anything about this episode...
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full w-8 h-8 text-white/40 hover:text-white hover:bg-white/10 shrink-0"
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
