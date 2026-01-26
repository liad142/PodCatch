"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SummaryStatusBadge } from "./SummaryStatusBadge";
import type { 
  QuickSummaryContent, 
  DeepSummaryContent, 
  SummaryStatus,
  EpisodeSummariesResponse 
} from "@/types/database";
import {
  Sparkles,
  Zap,
  BookOpen,
  Loader2,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Target,
  FileText,
  Link as LinkIcon,
} from "lucide-react";

interface SummaryPanelProps {
  episodeId: string;
  episodeTitle?: string;
  audioUrl?: string;
  onClose?: () => void;
}

type TabType = 'quick' | 'deep';

export function SummaryPanel({ episodeId, episodeTitle, onClose }: SummaryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [data, setData] = useState<EpisodeSummariesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<TabType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/episodes/${episodeId}/summaries`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result);
      return result;
    } catch (err) {
      console.error('Error fetching summaries:', err);
      setError('Failed to load summaries');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling when processing
  useEffect(() => {
    const quickStatus = data?.summaries?.quick?.status;
    const deepStatus = data?.summaries?.deep?.status;
    const isProcessing = ['queued', 'transcribing', 'summarizing'].includes(quickStatus || '') ||
                         ['queued', 'transcribing', 'summarizing'].includes(deepStatus || '');

    if (!isProcessing) return;

    const interval = setInterval(fetchStatus, 2500);
    return () => clearInterval(interval);
  }, [data, fetchStatus]);

  const handleGenerate = async (level: TabType) => {
    setIsGenerating(level);
    setError(null);

    try {
      const res = await fetch(`/api/episodes/${episodeId}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Generation failed');
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(null);
    }
  };

  const quickSummary = data?.summaries?.quick;
  const deepSummary = data?.summaries?.deep;
  const currentStatus = activeTab === 'quick' ? quickSummary?.status : deepSummary?.status;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold line-clamp-1">{episodeTitle || 'Episode Summary'}</h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'quick' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('quick')}
            className="flex-1"
          >
            <Zap className="mr-2 h-4 w-4" />
            Quick
            {quickSummary?.status === 'ready' && (
              <Badge variant="secondary" className="ml-2 text-xs">Ready</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'deep' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('deep')}
            className="flex-1"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Deep
            {deepSummary?.status === 'ready' && (
              <Badge variant="secondary" className="ml-2 text-xs">Ready</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => fetchStatus()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : activeTab === 'quick' ? (
          <QuickSummaryView
            summary={quickSummary?.content as QuickSummaryContent | undefined}
            status={quickSummary?.status || 'not_ready'}
            isGenerating={isGenerating === 'quick'}
            onGenerate={() => handleGenerate('quick')}
          />
        ) : (
          <DeepSummaryView
            summary={deepSummary?.content as DeepSummaryContent | undefined}
            status={deepSummary?.status || 'not_ready'}
            isGenerating={isGenerating === 'deep'}
            onGenerate={() => handleGenerate('deep')}
          />
        )}
      </div>
    </div>
  );
}

// Quick Summary View Component
function QuickSummaryView({
  summary,
  status,
  isGenerating,
  onGenerate
}: {
  summary?: QuickSummaryContent;
  status: SummaryStatus;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  if (['queued', 'transcribing', 'summarizing'].includes(status)) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {status === 'queued' && 'Queued for processing...'}
          {status === 'transcribing' && 'Transcribing audio...'}
          {status === 'summarizing' && 'Generating summary...'}
        </p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Summary generation failed</p>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Retry
        </Button>
      </div>
    );
  }

  if (!summary || status === 'not_ready') {
    return (
      <div className="text-center py-12">
        <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Quick Summary</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Get the key points in 30 seconds. Perfect for deciding if this episode is for you.
        </p>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Create Quick Summary
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TL;DR */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            TL;DR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{summary.tldr}</p>
        </CardContent>
      </Card>

      {/* Key Takeaways */}
      {summary.key_takeaways && summary.key_takeaways.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Key Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.key_takeaways.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Who is this for */}
      {summary.who_is_this_for && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Who is this for?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{summary.who_is_this_for}</p>
          </CardContent>
        </Card>
      )}

      {/* Topics */}
      {summary.topics && summary.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.topics.map((topic, i) => (
            <Badge key={i} variant="secondary">{topic}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Deep Summary View Component
function DeepSummaryView({
  summary,
  status,
  isGenerating,
  onGenerate
}: {
  summary?: DeepSummaryContent;
  status: SummaryStatus;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  if (['queued', 'transcribing', 'summarizing'].includes(status)) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {status === 'queued' && 'Queued for processing...'}
          {status === 'transcribing' && 'Transcribing audio...'}
          {status === 'summarizing' && 'Generating deep analysis...'}
        </p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Deep analysis failed</p>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Retry
        </Button>
      </div>
    );
  }

  if (!summary || status === 'not_ready') {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Deep Analysis</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Get a structured breakdown with sections, resources, and actionable next steps.
        </p>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Deep Analysis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TL;DR */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            TL;DR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{summary.tldr}</p>
        </CardContent>
      </Card>

      {/* Sections */}
      {summary.sections && summary.sections.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Breakdown
          </h3>
          {summary.sections.map((section, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">{section.summary}</p>
                {section.key_points && section.key_points.length > 0 && (
                  <ul className="space-y-1">
                    {section.key_points.map((point, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resources */}
      {summary.resources && summary.resources.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Resources Mentioned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.resources.map((resource, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {resource.type}
                  </Badge>
                  <div>
                    {resource.url ? (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {resource.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-medium">{resource.label}</span>
                    )}
                    {resource.notes && (
                      <p className="text-sm text-muted-foreground mt-0.5">{resource.notes}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Prompts */}
      {summary.action_prompts && summary.action_prompts.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {summary.action_prompts.map((action, i) => (
                <li key={i}>
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{action.details}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Topics */}
      {summary.topics && summary.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.topics.map((topic, i) => (
            <Badge key={i} variant="secondary">{topic}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
