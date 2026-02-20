"use client";

import { Play, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAskAI } from "@/contexts/AskAIContext";
import { useAudioPlayerSafe } from "@/contexts/AudioPlayerContext";
import type { Track } from "@/contexts/AudioPlayerContext";

/**
 * Ask AI bar with two visual modes:
 * - standalone: floating unified pill at the bottom (when player is NOT active)
 *   Layout: [▶] | [✨ Ask anything... | 💬]
 * - integrated: compact dark row inside the StickyAudioPlayer
 */
export function AskAIBar({ mode, track }: { mode: "standalone" | "integrated"; track?: Track }) {
  const { active, openChat } = useAskAI();
  const player = useAudioPlayerSafe();
  const playerActive = !!(player && player.currentTrack);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (track && player) {
      player.play(track);
    }
  };

  // Standalone: only show when on insights page AND player is NOT active
  if (mode === "standalone") {
    if (!active || playerActive) return null;

    const showPlay = !!(track && player);

    return (
      <div className="fixed bottom-6 left-4 right-4 z-50 pointer-events-none flex justify-center">
        <div className="pointer-events-auto w-full max-w-xl">
          <div className="bg-card/90 backdrop-blur-md dark:bg-muted/90 rounded-full shadow-2xl shadow-black/20 dark:shadow-indigo-500/10 flex items-center border border-border dark:border-white/10 overflow-hidden transition-transform hover:scale-[1.01]">

            {/* Play section */}
            {showPlay && (
              <>
                <button
                  onClick={handlePlay}
                  className="flex items-center gap-2 px-5 py-3 hover:bg-muted/60 dark:hover:bg-white/10 transition-colors shrink-0 group/play"
                  aria-label="Play episode"
                >
                  <Play className="h-4 w-4 fill-current text-foreground group-hover/play:text-primary transition-colors" />
                  <span className="text-sm font-semibold text-foreground group-hover/play:text-primary transition-colors">Play</span>
                </button>
                <div className="w-px h-6 bg-border shrink-0" />
              </>
            )}

            {/* Ask AI section */}
            <div
              className="flex-1 flex items-center gap-2.5 px-4 py-2 cursor-text"
              onClick={() => openChat()}
            >
              <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full p-1.5 shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 text-muted-foreground text-sm font-medium truncate">
                Ask anything...
              </div>
              <Button
                size="icon"
                className="rounded-full w-9 h-9 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow"
                onClick={(e) => { e.stopPropagation(); openChat(); }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Integrated: only show when on insights page AND player IS active
  if (!active) return null;

  return (
    <div
      className="px-4 py-2.5 border-b border-white/[0.06] cursor-text hover:bg-white/[0.03] transition-colors"
      onClick={() => openChat()}
    >
      <div className="flex items-center gap-2.5">
        <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full p-1 shrink-0">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <div className="flex-1 text-white/50 text-sm truncate">
          Ask anything...
        </div>
        <MessageSquare className="h-3.5 w-3.5 text-white/30 shrink-0" />
      </div>
    </div>
  );
}
