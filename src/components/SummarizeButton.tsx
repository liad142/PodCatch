"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSummarizeQueue } from '@/contexts/SummarizeQueueContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  SoundWaveAnimation,
  ParticleGemAnimation,
  GemCompleteAnimation,
  QueuePositionIndicator
} from '@/components/animations';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import type { QueueItemState } from '@/types/queue';

interface SummarizeButtonProps {
  episodeId: string;
  initialStatus?: 'not_ready' | 'ready' | 'failed' | 'transcribing' | 'summarizing' | 'queued';
  className?: string;
}

// Map initialStatus to QueueItemState
function mapInitialStatus(status: string): QueueItemState {
  switch (status) {
    case 'ready': return 'ready';
    case 'failed': return 'failed';
    case 'transcribing': return 'transcribing';
    case 'summarizing': return 'summarizing';
    case 'queued': return 'queued';
    default: return 'idle';
  }
}

export function SummarizeButton({ episodeId, initialStatus = 'not_ready', className = '' }: SummarizeButtonProps) {
  const router = useRouter();
  const { user, setShowCompactPrompt } = useAuth();
  const { addToQueue, retryEpisode, getQueueItem, getQueuePosition } = useSummarizeQueue();
  const resumedRef = useRef(false);

  const queueItem = getQueueItem(episodeId);
  const queuePosition = getQueuePosition(episodeId);

  // Use queue state if in queue, otherwise map initialStatus from parent
  const state: QueueItemState = queueItem?.state || mapInitialStatus(initialStatus);

  // Auto-resume polling for in-progress summaries detected on page load
  useEffect(() => {
    const isInProgress = ['transcribing', 'summarizing', 'queued'].includes(initialStatus);
    if (isInProgress && !queueItem && !resumedRef.current) {
      resumedRef.current = true;
      // Add to queue to start polling - this will pick up the existing backend process
      addToQueue(episodeId);
    }
  }, [initialStatus, episodeId, queueItem, addToQueue]);

  const handleClick = () => {
    switch (state) {
      case 'idle':
        if (!user) {
          setShowCompactPrompt(true, 'Only registered users can summarize episodes. Please sign in or create an account to continue.');
          return;
        }
        addToQueue(episodeId);
        break;
      case 'ready':
        router.push(`/episode/${episodeId}/insights?tab=summary`);
        break;
      case 'failed':
        if (!user) {
          setShowCompactPrompt(true, 'Only registered users can summarize episodes. Please sign in or create an account to continue.');
          return;
        }
        retryEpisode(episodeId);
        break;
      default:
        break;
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Summarize
          </>
        );

      case 'queued':
        return <QueuePositionIndicator position={queuePosition} />;

      case 'transcribing':
        return (
          <div className="flex items-center gap-2">
            <SoundWaveAnimation className="h-5" />
            <span className="text-xs">Transcribing...</span>
          </div>
        );

      case 'summarizing':
        return (
          <div className="flex items-center gap-2">
            <ParticleGemAnimation className="h-5 w-8" />
            <span className="text-xs">Summarizing...</span>
          </div>
        );

      case 'ready':
        return (
          <div className="flex items-center gap-2">
            <GemCompleteAnimation className="h-5 w-5" />
            <span>View Summary</span>
          </div>
        );

      case 'failed':
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            <span>Failed</span>
            <RefreshCw className="ml-2 h-3 w-3" />
          </>
        );

      default:
        return null;
    }
  };

  const getVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (state) {
      case 'failed':
        return 'destructive';
      case 'ready':
        return 'default';
      case 'queued':
      case 'transcribing':
      case 'summarizing':
        return 'outline';
      default:
        return 'default';
    }
  };

  const isInteractive = ['idle', 'ready', 'failed'].includes(state);

  const isGradientState = state === 'idle' || state === 'ready';

  return (
    <Button
      variant={getVariant()}
      size="sm"
      onClick={handleClick}
      disabled={!isInteractive}
      className={cn(
        'rounded-full px-5 transition-all hover:scale-105 active:scale-95',
        isGradientState && 'bg-gradient-to-r from-violet-600 to-indigo-600 border-0 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40',
        className
      )}
    >
      {renderContent()}
    </Button>
  );
}
