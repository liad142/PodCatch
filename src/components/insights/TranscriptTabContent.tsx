"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, Search, Download, ScrollText } from "lucide-react";

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

  const isTranscribing = ['queued', 'transcribing'].includes(transcriptStatus);
  const hasTranscript = transcriptStatus === 'ready' && transcript;

  // Highlight search matches
  const highlightedText = useMemo(() => {
    if (!transcript || !searchQuery.trim()) return transcript;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return transcript.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
  }, [transcript, searchQuery]);

  const matchCount = useMemo(() => {
    if (!transcript || !searchQuery.trim()) return 0;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (transcript.match(regex) || []).length;
  }, [transcript, searchQuery]);

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

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!hasTranscript) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center p-4">
        <ScrollText className="h-12 w-12 text-muted-foreground mb-4" />
        {isTranscribing ? (
          <>
            <p className="text-muted-foreground">Transcribing audio...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a few minutes</p>
          </>
        ) : transcriptStatus === 'failed' ? (
          <>
            <p className="text-destructive">Transcription failed</p>
            <p className="text-sm text-muted-foreground mt-1">Please try generating insights again</p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">No transcript available</p>
            <p className="text-sm text-muted-foreground mt-1">Generate insights to create a transcript</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and Actions */}
      <div className="flex gap-2 p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && matchCount > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          title="Copy transcript"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleDownload}
          title="Download transcript"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Transcript Content */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedText || '' }}
        />
      </div>

      {/* Word Count Footer */}
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        {transcript.split(/\s+/).length.toLocaleString()} words
      </div>
    </div>
  );
}
