"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  isStreaming?: boolean;
}

const MAX_MESSAGES = 20;

export function useAskAIChat(episodeId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Clear chat when episode changes
  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
    setError(null);
  }, [episodeId]);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!episodeId || !question.trim() || isStreaming) return;

      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text: question.trim(),
      };

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "",
        isStreaming: true,
      };

      setMessages((prev) => {
        const next = [...prev, userMsg, assistantMsg];
        // Client-side limit
        if (next.length > MAX_MESSAGES) {
          return next.slice(next.length - MAX_MESSAGES);
        }
        return next;
      });

      setIsStreaming(true);

      try {
        // Build history from existing messages (exclude the new ones we just added)
        const history = messages
          .filter((m) => !m.isStreaming)
          .map((m) => ({
            role: m.role === "user" ? ("user" as const) : ("model" as const),
            text: m.text,
          }));

        const res = await fetch(`/api/episodes/${episodeId}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: question.trim(), history }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const payload = trimmed.slice(6);
            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, text: m.text + parsed.text }
                      : m
                  )
                );
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }

        // Mark streaming complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
          )
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;

        const errorMsg = err instanceof Error ? err.message : "Something went wrong";
        setError(errorMsg);

        // Remove the empty assistant message on error
        setMessages((prev) => {
          const updated = prev.filter((m) => m.id !== assistantMsg.id);
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [episodeId, isStreaming, messages]
  );

  return { messages, isStreaming, error, sendMessage, clearChat };
}
