"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy,
  Check,
  Search,
  Download,
  ScrollText,
  User,
  Mic,
  Edit3,
  Filter
} from "lucide-react";
import { TranscriptMessage } from "./TranscriptMessage";
import { SpeakerIdentifier } from "./SpeakerIdentifier";
import type { ParsedTranscriptSegment, SpeakerInfo } from "@/types/transcript";

interface TranscriptTabContentProps {
  transcript: string | undefined;
  transcriptStatus: string;
  isLoading: boolean;
}

export function TranscriptTabContent({
  transcript,
  transcriptStatus,
  isLoading
}: TranscriptTabContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [speakers, setSpeakers] = useState<Map<string, SpeakerInfo>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  const isTranscribing = ['queued', 'transcribing'].includes(transcriptStatus);
  const hasTranscript = transcriptStatus === 'ready' && transcript;

  // Detect if text is RTL (Hebrew, Arabic, Persian, etc.)
  const isRTLText = (text: string): boolean => {
    // RTL Unicode ranges: Hebrew (0590-05FF), Arabic (0600-06FF, 0750-077F), etc.
    const rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const rtlMatches = (text.match(rtlChars) || []).length;
    const latinChars = /[a-zA-Z]/g;
    const latinMatches = (text.match(latinChars) || []).length;
    // If more RTL characters than Latin, consider it RTL
    return rtlMatches > latinMatches;
  };

  // Parse transcript into segments with speaker detection
  const segments = useMemo<ParsedTranscriptSegment[]>(() => {
    if (!transcript) return [];

    // Parse the transcript looking for patterns
    const lines = transcript.split('\n').filter(line => line.trim());
    const parsed: ParsedTranscriptSegment[] = [];

    let currentSpeaker = 'Unknown Speaker';
    let segmentId = 0;

    for (const line of lines) {
      // Match timestamp format [00:00] or (00:00) at start of line
      const timestampMatch = line.match(/^[\[\(](\d{1,2}:\d{2}(?::\d{2})?)[\]\)]\s*/);
      // Match speaker pattern: "Speaker Name:" at start (after optional timestamp)
      const speakerMatch = line.match(/^(?:[\[\(]\d{1,2}:\d{2}(?::\d{2})?[\]\)]\s*)?([A-Z][^:]{1,30}):\s*(.+)/);

      let timestamp: string | undefined;
      let text: string;

      if (timestampMatch) {
        timestamp = timestampMatch[1];
        text = line.substring(timestampMatch[0].length);
      } else {
        text = line;
      }

      if (speakerMatch) {
        currentSpeaker = speakerMatch[1].trim();
        text = speakerMatch[2];
      }

      if (text.trim()) {
        parsed.push({
          id: `segment-${segmentId++}`,
          speaker: currentSpeaker,
          text: text.trim(),
          timestamp,
          isRTL: isRTLText(text)
        });
      }
    }

    return parsed;
  }, [transcript]);

  const uniqueSpeakers = useMemo(() => {
    const speakerSet = new Set<string>();
    segments.forEach(seg => speakerSet.add(seg.speaker));
    return Array.from(speakerSet);
  }, [segments]);

  useEffect(() => {
    const speakerMap = new Map<string, SpeakerInfo>();
    const colors = [
      '#FF6B9D', '#4ECDC4', '#FFE66D', '#95E1D3',
      '#C7CEEA', '#FF8B94', '#A8E6CF', '#FFD3B6',
    ];

    uniqueSpeakers.forEach((speaker, index) => {
      speakerMap.set(speaker, {
        name: speaker,
        color: colors[index % colors.length],
        avatar: speaker.charAt(0).toUpperCase()
      });
    });

    setSpeakers(speakerMap);
  }, [uniqueSpeakers]);

  const filteredSegments = useMemo(() => {
    let filtered = segments;

    if (selectedSpeaker) {
      filtered = filtered.filter(seg => seg.speaker === selectedSpeaker);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(seg =>
        seg.text.toLowerCase().includes(query) ||
        seg.speaker.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [segments, searchQuery, selectedSpeaker]);

  const matchCount = filteredSegments.length;

  const handleCopy = async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSpeakerUpdate = (oldName: string, newName: string) => {
    const updatedSpeakers = new Map(speakers);
    const speakerInfo = updatedSpeakers.get(oldName);
    if (speakerInfo) {
      updatedSpeakers.delete(oldName);
      updatedSpeakers.set(newName, { ...speakerInfo, name: newName });
      setSpeakers(updatedSpeakers);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex gap-3 p-6 border-b border-slate-200 dark:border-slate-800">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-32" />
        </div>
        <div className="flex-1 p-6 space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 animate-pulse">
              <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasTranscript) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-6 shadow-lg shadow-indigo-500/30">
            <ScrollText size={40} />
          </div>
          {isTranscribing ? (
            <>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Transcribing audio...
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                This may take a few minutes. We're converting speech to text.
              </p>
              <div className="flex justify-center gap-1.5">
                {[0, 150, 300, 450, 600].map((delay) => (
                  <div
                    key={delay}
                    className="w-1 h-8 bg-gradient-to-t from-indigo-500 to-purple-600 rounded-sm"
                    style={{
                      animation: 'wave 1.2s ease-in-out infinite',
                      animationDelay: `${delay}ms`
                    }}
                  />
                ))}
              </div>
            </>
          ) : transcriptStatus === 'failed' ? (
            <>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Transcription failed
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                We couldn't transcribe this episode. Please try generating insights again.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                No transcript available
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Generate insights to create a transcript for this episode.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="flex gap-3 p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          <Input
            type="text"
            placeholder="Search conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-24 h-12 rounded-full border-2 border-transparent bg-slate-100 dark:bg-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all"
          />
          {searchQuery && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
              {matchCount} {matchCount === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsIdentifying(!isIdentifying)}
            className="h-12 px-5 rounded-full border-2 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all"
          >
            <Edit3 size={16} className="mr-2" />
            <span className="font-medium">Identify Speakers</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title="Copy transcript"
            className="h-12 w-12 rounded-full border-2 hover:bg-indigo-50 hover:border-indigo-500 dark:hover:bg-indigo-950 transition-all"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            title="Download transcript"
            className="h-12 w-12 rounded-full border-2 hover:bg-indigo-50 hover:border-indigo-500 dark:hover:bg-indigo-950 transition-all"
          >
            <Download size={16} />
          </Button>
        </div>
      </div>

      {/* Speaker Filter */}
      {uniqueSpeakers.length > 1 && (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg">
          <Filter size={14} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Filter by speaker:
          </span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSpeaker(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                !selectedSpeaker
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              All
            </button>
            {uniqueSpeakers.map(speaker => {
              const info = speakers.get(speaker);
              const isActive = speaker === selectedSpeaker;
              return (
                <button
                  key={speaker}
                  onClick={() => setSelectedSpeaker(isActive ? null : speaker)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                    isActive
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                  style={isActive ? { backgroundColor: info?.color } : {}}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: info?.color }}
                  >
                    {info?.avatar}
                  </span>
                  {speaker}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Speaker Identifier Modal */}
      {isIdentifying && (
        <SpeakerIdentifier
          speakers={Array.from(speakers.values())}
          onUpdate={handleSpeakerUpdate}
          onClose={() => setIsIdentifying(false)}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {filteredSegments.map((segment, index) => {
            const speakerInfo = speakers.get(segment.speaker);
            const prevSegment = index > 0 ? filteredSegments[index - 1] : null;
            const isGrouped = prevSegment?.speaker === segment.speaker;

            return (
              <TranscriptMessage
                key={segment.id}
                segment={segment}
                speakerInfo={speakerInfo}
                isGrouped={isGrouped}
                searchQuery={searchQuery}
                index={index}
              />
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-center gap-8 px-6 py-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Mic size={14} />
          <span>{uniqueSpeakers.length} {uniqueSpeakers.length === 1 ? 'speaker' : 'speakers'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          <ScrollText size={14} />
          <span>{segments.length} segments</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          <User size={14} />
          <span>{transcript.split(/\s+/).length.toLocaleString()} words</span>
        </div>
      </div>
    </div>
  );
}
