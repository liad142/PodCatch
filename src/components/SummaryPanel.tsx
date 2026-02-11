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
      {/* Hook Headline */}
      {summary.hook_headline && (
        <Card className="border-primary/50">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold">{summary.hook_headline}</h2>
          </CardContent>
        </Card>
      )}

      {/* Executive Brief */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Executive Brief
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{summary.executive_brief}</p>
        </CardContent>
      </Card>

      {/* Golden Nugget */}
      {summary.golden_nugget && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              ✨ Golden Nugget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground italic">{summary.golden_nugget}</p>
          </CardContent>
        </Card>
      )}

      {/* Perfect For */}
      {summary.perfect_for && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Perfect For
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{summary.perfect_for}</p>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {summary.tags && summary.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.tags.map((tag, i) => (
            <Badge key={i} variant="secondary">{tag}</Badge>
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
      {/* Comprehensive Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Comprehensive Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {summary.comprehensive_overview.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Core Concepts */}
      {summary.core_concepts && summary.core_concepts.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Core Concepts
          </h3>
          {summary.core_concepts.map((concept, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-primary">{concept.concept}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">{concept.explanation}</p>
                {concept.quote_reference && (
                  <blockquote className="border-l-4 border-primary/30 pl-4 italic text-sm">
                    "{concept.quote_reference}"
                  </blockquote>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chronological Breakdown */}
      {summary.chronological_breakdown && summary.chronological_breakdown.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Episode Flow
          </h3>
          {summary.chronological_breakdown.map((section, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Badge variant="outline" className="text-xs">
                  {section.title || section.timestamp_description}
                </Badge>
                <p className="text-sm">{section.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contrarian Views */}
      {summary.contrarian_views && summary.contrarian_views.length > 0 && (
        <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Contrarian Views & Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.contrarian_views.map((view, i) => (
                <li key={i} className="text-sm">{view}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actionable Takeaways */}
      {summary.actionable_takeaways && summary.actionable_takeaways.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Actionable Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.actionable_takeaways.map((action, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <p className="text-sm flex-1">{typeof action === 'string' ? action : action.text}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
