"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface AskAIContextType {
  active: boolean;
  episodeId: string | null;
  activate: (episodeId: string) => void;
  deactivate: () => void;
}

const AskAIContext = createContext<AskAIContextType>({
  active: false,
  episodeId: null,
  activate: () => {},
  deactivate: () => {},
});

/** Wrap at the AppShell level so both page content and StickyAudioPlayer share state. */
export function AskAIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ active: boolean; episodeId: string | null }>({
    active: false,
    episodeId: null,
  });

  const activate = useCallback((episodeId: string) => {
    setState({ active: true, episodeId });
  }, []);

  const deactivate = useCallback(() => {
    setState({ active: false, episodeId: null });
  }, []);

  const value = useMemo(
    () => ({ ...state, activate, deactivate }),
    [state, activate, deactivate]
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
