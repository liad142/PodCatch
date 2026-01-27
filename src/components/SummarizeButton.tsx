"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSummarizeQueue } from '@/contexts/SummarizeQueueContext';
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
  initialStatus?: 'not_ready' | 'ready' | 'failed';
  className?: string;
}

export function SummarizeButton({ episodeId, initialStatus = 'not_ready', className = '' }: SummarizeButtonProps) {
  const router = useRouter();
  const { addToQueue, retryEpisode, getQueueItem, getQueuePosition } = useSummarizeQueue();

  const queueItem = getQueueItem(episodeId);
  const queuePosition = getQueuePosition(episodeId);

  const state: QueueItemState = queueItem?.state || (initialStatus === 'ready' ? 'ready' : 'idle');

  const handleClick = () => {
    switch (state) {
      case 'idle':
        addToQueue(episodeId);
        break;
      case 'ready':
        router.push(`/episode/${episodeId}/insights?tab=summary`);
        break;
      case 'failed':
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

  return (
    <Button
      variant={getVariant()}
      size="sm"
      onClick={handleClick}
      disabled={!isInteractive}
      className={`min-w-[140px] transition-all ${className}`}
    >
      {renderContent()}
    </Button>
  );
}
