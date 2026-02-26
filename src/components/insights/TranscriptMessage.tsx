"use client";

import { useMemo } from "react";
import type { ParsedTranscriptSegment, SpeakerInfo } from "@/types/transcript";

interface TranscriptMessageProps {
  segment: ParsedTranscriptSegment;
  speakerInfo?: SpeakerInfo;
  isGrouped: boolean;
  searchQuery: string;
  index: number;
}

export function TranscriptMessage({
  segment,
  speakerInfo,
  isGrouped,
  searchQuery,
  index
}: TranscriptMessageProps) {
  const isRTL = segment.isRTL || false;

  // Highlight search matches using React nodes (safe — no dangerouslySetInnerHTML)
  const highlightedContent = useMemo(() => {
    if (!searchQuery.trim()) return segment.text;

    const regex = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    return segment.text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 dark:bg-yellow-400/30 dark:text-yellow-200 px-1 py-0.5 rounded font-semibold">{part}</mark>
      ) : part
    );
  }, [segment.text, searchQuery]);

  const speakerColor = speakerInfo?.color || '#6366f1';
  const speakerAvatar = speakerInfo?.avatar || '?';
  const speakerName = speakerInfo?.realName || speakerInfo?.name || 'Unknown';

  const animationDelay = `${Math.min(index * 30, 500)}ms`;

  return (
    <div
      className={`flex gap-4 opacity-0 ${isGrouped ? (isRTL ? 'pr-14 sm:pr-16' : 'pl-14 sm:pl-16') : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        animationDelay
      }}
    >
      {!isGrouped && (
        <div className="relative flex-shrink-0">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm sm:text-base font-bold text-white shadow-md transition-transform duration-200 hover:scale-105 relative z-10"
            style={{ backgroundColor: speakerColor }}
          >
            {speakerAvatar}
          </div>
          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-full opacity-20 blur-sm"
            style={{ backgroundColor: speakerColor }}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className={`flex items-center gap-3 mb-1.5 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            {segment.timestamp && (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                ▶ {segment.timestamp}
              </span>
            )}
            <span
              className="text-sm font-semibold px-2.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: speakerColor }}
            >
              {speakerName}
            </span>
          </div>
        )}

        {/* Timestamp for grouped messages */}
        {isGrouped && segment.timestamp && (
          <div className={`mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              ▶ {segment.timestamp}
            </span>
          </div>
        )}

        <div
          className={`
            text-base leading-relaxed text-foreground
            ${isRTL ? 'text-right' : 'text-left'}
          `}
          style={{
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {highlightedContent}
        </div>
      </div>
    </div>
  );
}
