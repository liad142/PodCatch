"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface AskAIContextType {
  active: boolean;
  episodeId: string | null;
  chatOpen: boolean;
  activate: (episodeId: string) => void;
  deactivate: () => void;
  /** Player calls this when it detects a playable episode has a transcript */
  activateFromPlayer: (episodeId: string) => void;
  /** Player calls this when track stops or changes to one without transcript */
  deactivateFromPlayer: () => void;
  openChat: () => void;
  closeChat: () => void;
}

const AskAIContext = createContext<AskAIContextType>({
  active: false,
  episodeId: null,
  chatOpen: false,
  activate: () => {},
  deactivate: () => {},
  activateFromPlayer: () => {},
  deactivateFromPlayer: () => {},
  openChat: () => {},
  closeChat: () => {},
});

/** Wrap at the AppShell level so both page content and StickyAudioPlayer share state. */
export function AskAIProvider({ children }: { children: React.ReactNode }) {
  // Track page and player activations independently
  const [pageEpisodeId, setPageEpisodeId] = useState<string | null>(null);
  const [playerEpisodeId, setPlayerEpisodeId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Page takes priority over player. Either source means "active".
  const activeEpisodeId = pageEpisodeId ?? playerEpisodeId;
  const active = activeEpisodeId !== null;

  // Page activation (from insights page — takes priority)
  const activate = useCallback((episodeId: string) => {
    setPageEpisodeId(episodeId);
  }, []);

  // Page deactivation (when leaving insights page — falls back to player if active)
  const deactivate = useCallback(() => {
    setPageEpisodeId(null);
  }, []);

  // Player activation
  const activateFromPlayer = useCallback((episodeId: string) => {
    setPlayerEpisodeId(episodeId);
  }, []);

  // Player deactivation
  const deactivateFromPlayer = useCallback(() => {
    setPlayerEpisodeId(null);
  }, []);

  const openChat = useCallback(() => {
    setChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setChatOpen(false);
  }, []);

  // Close chat when Ask AI becomes inactive
  useEffect(() => {
    if (!active) setChatOpen(false);
  }, [active]);

  const value = useMemo(
    () => ({
      active,
      episodeId: activeEpisodeId,
      chatOpen,
      activate,
      deactivate,
      activateFromPlayer,
      deactivateFromPlayer,
      openChat,
      closeChat,
    }),
    [active, activeEpisodeId, chatOpen, activate, deactivate, activateFromPlayer, deactivateFromPlayer, openChat, closeChat]
  );

  return (
    <AskAIContext.Provider value={value}>{children}</AskAIContext.Provider>
  );
}

/** Call from the insights page to signal "show Ask AI". Cleans up on unmount. */
export function useActivateAskAI(episodeId: string) {
  const { activate, deactivate } = useContext(AskAIContext);
  useEffect(() => {
    activate(episodeId);
    return () => deactivate();
  }, [episodeId, activate, deactivate]);
}

/**
 * Hook for the StickyAudioPlayer to auto-activate Ask AI when
 * playing an episode that has a transcript available.
 */
export function usePlayerAskAI(episodeId: string | null) {
  const { activateFromPlayer, deactivateFromPlayer } = useContext(AskAIContext);
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!episodeId) {
      deactivateFromPlayer();
      checkedRef.current = null;
      return;
    }

    // Don't re-check the same episode
    if (checkedRef.current === episodeId) return;
    checkedRef.current = episodeId;

    // Capture for closure (TypeScript narrowing doesn't carry into async)
    const id = episodeId;
    let cancelled = false;

    // Lightweight check: does this episode have a transcript?
    async function checkTranscript() {
      try {
        const res = await fetch(`/api/episodes/${id}/summaries/status`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;

        // If any summary or transcript is ready, activate Ask AI
        const hasContent =
          data?.summaries?.quick?.status === "ready" ||
          data?.summaries?.deep?.status === "ready" ||
          data?.transcript?.status === "ready";

        if (hasContent) {
          activateFromPlayer(id);
        } else {
          deactivateFromPlayer();
        }
      } catch {
        // Silently fail — don't show Ask AI if check fails
      }
    }

    checkTranscript();

    return () => {
      cancelled = true;
    };
  }, [episodeId, activateFromPlayer, deactivateFromPlayer]);
}

export function useAskAI() {
  return useContext(AskAIContext);
}
