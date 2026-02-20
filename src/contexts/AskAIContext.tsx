"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface AskAIContextType {
  active: boolean;
  episodeId: string | null;
  chatOpen: boolean;
  activate: (episodeId: string) => void;
  deactivate: () => void;
  openChat: () => void;
  closeChat: () => void;
}

const AskAIContext = createContext<AskAIContextType>({
  active: false,
  episodeId: null,
  chatOpen: false,
  activate: () => {},
  deactivate: () => {},
  openChat: () => {},
  closeChat: () => {},
});

/** Wrap at the AppShell level so both page content and StickyAudioPlayer share state. */
export function AskAIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ active: boolean; episodeId: string | null; chatOpen: boolean }>({
    active: false,
    episodeId: null,
    chatOpen: false,
  });

  const activate = useCallback((episodeId: string) => {
    setState((prev) => ({ ...prev, active: true, episodeId }));
  }, []);

  const deactivate = useCallback(() => {
    setState({ active: false, episodeId: null, chatOpen: false });
  }, []);

  const openChat = useCallback(() => {
    setState((prev) => ({ ...prev, chatOpen: true }));
  }, []);

  const closeChat = useCallback(() => {
    setState((prev) => ({ ...prev, chatOpen: false }));
  }, []);

  const value = useMemo(
    () => ({ ...state, activate, deactivate, openChat, closeChat }),
    [state, activate, deactivate, openChat, closeChat]
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

export function useAskAI() {
  return useContext(AskAIContext);
}
