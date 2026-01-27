# Summarize Queue Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace immediate navigation on "Summarize" click with an animated queue-based system that processes episodes on the list page and only allows navigation when Quick Summary is ready.

**Architecture:** React Context for global queue state, Framer Motion for animations (already installed), existing API endpoints for processing. New components handle animation stages, queue indicator, and smart button. Modified EpisodeCard consumes queue context.

**Tech Stack:** React 19, Next.js 16, Framer Motion 12, TypeScript, Tailwind CSS, existing Supabase + API routes

---

## Task 1: Create Queue Types

**Files:**
- Create: `src/types/queue.ts`

**Step 1: Create the queue types file**

```typescript
// src/types/queue.ts
import type { SummaryStatus } from './database';

// Queue item states
export type QueueItemState =
  | 'idle'           // Not in queue, can be added
  | 'queued'         // Waiting in queue
  | 'transcribing'   // Stage 1: Audio → Text
  | 'summarizing'    // Stage 2: Text → Summary
  | 'ready'          // Complete, can navigate
  | 'failed';        // Error occurred

// Single queue item
export interface QueueItem {
  episodeId: string;
  state: QueueItemState;
  retryCount: number;
  addedAt: number;
  error?: string;
}

// Queue context value
export interface SummarizeQueueContextValue {
  // Queue state
  queue: QueueItem[];
  processingId: string | null;

  // Actions
  addToQueue: (episodeId: string) => void;
  removeFromQueue: (episodeId: string) => void;
  retryEpisode: (episodeId: string) => void;

  // Selectors
  getQueueItem: (episodeId: string) => QueueItem | undefined;
  getQueuePosition: (episodeId: string) => number; // 0 = processing, -1 = not in queue

  // Stats for toast
  stats: {
    completed: number;
    failed: number;
    total: number;
  };
  clearStats: () => void;
}
```

**Step 2: Commit**

```bash
git add src/types/queue.ts
git commit -m "feat(queue): add queue types for summarize flow"
```

---

## Task 2: Create SummarizeQueueProvider Context

**Files:**
- Create: `src/contexts/SummarizeQueueContext.tsx`

**Step 1: Create the queue context provider**

```typescript
// src/contexts/SummarizeQueueContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { QueueItem, QueueItemState, SummarizeQueueContextValue } from '@/types/queue';

const SummarizeQueueContext = createContext<SummarizeQueueContextValue | null>(null);

export function useSummarizeQueue() {
  const context = useContext(SummarizeQueueContext);
  if (!context) {
    throw new Error('useSummarizeQueue must be used within SummarizeQueueProvider');
  }
  return context;
}

// Optional hook that doesn't throw (for components that may be outside provider)
export function useSummarizeQueueOptional() {
  return useContext(SummarizeQueueContext);
}

const MAX_RETRIES = 1;
const RETRY_DELAY = 2000;
const POLL_INTERVAL = 2500;

export function SummarizeQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ completed: 0, failed: 0, total: 0 });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  // Get queue item by episode ID
  const getQueueItem = useCallback((episodeId: string) => {
    return queue.find(item => item.episodeId === episodeId);
  }, [queue]);

  // Get position in queue (0 = processing, 1+ = waiting, -1 = not in queue)
  const getQueuePosition = useCallback((episodeId: string) => {
    const index = queue.findIndex(item => item.episodeId === episodeId);
    if (index === -1) return -1;
    if (queue[index].state === 'queued') {
      // Count how many are ahead (processing + queued before this)
      return queue.slice(0, index + 1).filter(i =>
        i.state === 'queued' || i.state === 'transcribing' || i.state === 'summarizing'
      ).length;
    }
    return 0; // Currently processing
  }, [queue]);

  // Update a queue item's state
  const updateQueueItem = useCallback((episodeId: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item =>
      item.episodeId === episodeId ? { ...item, ...updates } : item
    ));
  }, []);

  // Poll for status updates
  const pollStatus = useCallback(async (episodeId: string): Promise<QueueItemState> => {
    try {
      const res = await fetch(`/api/episodes/${episodeId}/summaries`);
      if (!res.ok) throw new Error('Failed to fetch status');

      const data = await res.json();
      const quickStatus = data.summaries?.quick?.status;
      const transcriptStatus = data.transcript?.status;

      // Map API status to queue state
      if (quickStatus === 'ready') return 'ready';
      if (quickStatus === 'failed' || transcriptStatus === 'failed') return 'failed';
      if (quickStatus === 'summarizing') return 'summarizing';
      if (transcriptStatus === 'transcribing' || quickStatus === 'transcribing') return 'transcribing';
      if (quickStatus === 'queued' || transcriptStatus === 'queued') return 'transcribing';

      return 'transcribing'; // Default during processing
    } catch {
      return 'failed';
    }
  }, []);

  // Start processing an episode
  const startProcessing = useCallback(async (episodeId: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessingId(episodeId);
    updateQueueItem(episodeId, { state: 'transcribing' });

    try {
      // Trigger the summary generation
      const res = await fetch(`/api/episodes/${episodeId}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'quick' })
      });

      if (!res.ok) throw new Error('Failed to start processing');

      // Start polling
      const poll = async () => {
        const state = await pollStatus(episodeId);
        updateQueueItem(episodeId, { state });

        if (state === 'ready') {
          setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
          processingRef.current = false;
          setProcessingId(null);
          return;
        }

        if (state === 'failed') {
          const item = queue.find(i => i.episodeId === episodeId);
          if (item && item.retryCount < MAX_RETRIES) {
            // Silent retry
            updateQueueItem(episodeId, { retryCount: item.retryCount + 1, state: 'transcribing' });
            setTimeout(() => startProcessing(episodeId), RETRY_DELAY);
          } else {
            // Mark as failed, move to next
            setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
            processingRef.current = false;
            setProcessingId(null);
          }
          return;
        }

        // Continue polling
        pollingRef.current = setTimeout(poll, POLL_INTERVAL);
      };

      pollingRef.current = setTimeout(poll, POLL_INTERVAL);
    } catch {
      // Handle initial request failure
      const item = queue.find(i => i.episodeId === episodeId);
      if (item && item.retryCount < MAX_RETRIES) {
        updateQueueItem(episodeId, { retryCount: item.retryCount + 1 });
        setTimeout(() => startProcessing(episodeId), RETRY_DELAY);
      } else {
        updateQueueItem(episodeId, { state: 'failed', error: 'Failed to start processing' });
        setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        processingRef.current = false;
        setProcessingId(null);
      }
    }
  }, [queue, pollStatus, updateQueueItem]);

  // Process next item in queue
  const processNext = useCallback(() => {
    if (processingRef.current) return;

    const nextItem = queue.find(item => item.state === 'queued');
    if (nextItem) {
      startProcessing(nextItem.episodeId);
    }
  }, [queue, startProcessing]);

  // Effect: Process next when current finishes
  useEffect(() => {
    if (!processingId && queue.some(item => item.state === 'queued')) {
      processNext();
    }
  }, [processingId, queue, processNext]);

  // Add episode to queue
  const addToQueue = useCallback((episodeId: string) => {
    // Check if already in queue
    const existing = queue.find(item => item.episodeId === episodeId);
    if (existing && existing.state !== 'failed') return;

    const newItem: QueueItem = {
      episodeId,
      state: 'queued',
      retryCount: 0,
      addedAt: Date.now()
    };

    setQueue(prev => {
      // Remove if exists (for retry case)
      const filtered = prev.filter(i => i.episodeId !== episodeId);
      return [...filtered, newItem];
    });
    setStats(prev => ({ ...prev, total: prev.total + 1 }));
  }, [queue]);

  // Remove from queue
  const removeFromQueue = useCallback((episodeId: string) => {
    setQueue(prev => prev.filter(item => item.episodeId !== episodeId));
  }, []);

  // Retry failed episode
  const retryEpisode = useCallback((episodeId: string) => {
    updateQueueItem(episodeId, { state: 'queued', retryCount: 0, error: undefined });
  }, [updateQueueItem]);

  // Clear stats (after showing toast)
  const clearStats = useCallback(() => {
    setStats({ completed: 0, failed: 0, total: 0 });
    // Also clean up completed/failed items from queue
    setQueue(prev => prev.filter(item =>
      item.state !== 'ready' && item.state !== 'failed'
    ));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const value: SummarizeQueueContextValue = {
    queue,
    processingId,
    addToQueue,
    removeFromQueue,
    retryEpisode,
    getQueueItem,
    getQueuePosition,
    stats,
    clearStats
  };

  return (
    <SummarizeQueueContext.Provider value={value}>
      {children}
    </SummarizeQueueContext.Provider>
  );
}
```

**Step 2: Commit**

```bash
git add src/contexts/SummarizeQueueContext.tsx
git commit -m "feat(queue): add SummarizeQueueProvider context"
```

---

## Task 3: Create Sound Wave Animation Component (Stage 1)

**Files:**
- Create: `src/components/animations/SoundWaveAnimation.tsx`

**Step 1: Create the sound wave animation**

```typescript
// src/components/animations/SoundWaveAnimation.tsx
"use client";

import { motion } from 'framer-motion';

interface SoundWaveAnimationProps {
  className?: string;
}

export function SoundWaveAnimation({ className = '' }: SoundWaveAnimationProps) {
  // Gradient colors: purple → blue → teal
  const barColors = [
    'from-purple-500 to-purple-400',
    'from-blue-500 to-blue-400',
    'from-cyan-500 to-cyan-400',
    'from-teal-500 to-teal-400',
  ];

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {barColors.map((color, index) => (
        <motion.div
          key={index}
          className={`w-1 rounded-full bg-gradient-to-t ${color}`}
          initial={{ height: 8 }}
          animate={{
            height: [8, 20, 12, 24, 8],
            opacity: [0.7, 1, 0.8, 1, 0.7],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400"
          initial={{
            x: -10 + (i * 5),
            y: 0,
            opacity: 0,
            scale: 0
          }}
          animate={{
            x: [null, 30 + (i * 3)],
            y: [null, -10 + (i % 3) * 8],
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/animations/SoundWaveAnimation.tsx
git commit -m "feat(animation): add SoundWaveAnimation component for transcribing stage"
```

---

## Task 4: Create Particle-to-Gem Animation Component (Stage 2)

**Files:**
- Create: `src/components/animations/ParticleGemAnimation.tsx`

**Step 1: Create the particle to gem animation**

```typescript
// src/components/animations/ParticleGemAnimation.tsx
"use client";

import { motion } from 'framer-motion';

interface ParticleGemAnimationProps {
  className?: string;
}

export function ParticleGemAnimation({ className = '' }: ParticleGemAnimationProps) {
  const particleCount = 8;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Swirling particles */}
      {[...Array(particleCount)].map((_, i) => {
        const angle = (i / particleCount) * 360;
        const radius = 16;
        const startX = Math.cos((angle * Math.PI) / 180) * radius;
        const startY = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: `linear-gradient(135deg,
                ${i % 2 === 0 ? '#f59e0b' : '#ec4899'},
                ${i % 2 === 0 ? '#ec4899' : '#8b5cf6'})`,
            }}
            initial={{ x: startX, y: startY, scale: 1, opacity: 0.8 }}
            animate={{
              x: [startX, startX * 0.5, 0],
              y: [startY, startY * 0.5, 0],
              scale: [1, 0.8, 0],
              opacity: [0.8, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        );
      })}

      {/* Forming gem in center */}
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: 0 }}
        animate={{
          scale: [0, 0.3, 0.5, 0.3],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Gem shape */}
        <div
          className="w-4 h-4 rotate-45 rounded-sm"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
            boxShadow: '0 0 12px rgba(236, 72, 153, 0.5)',
          }}
        />
      </motion.div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/animations/ParticleGemAnimation.tsx
git commit -m "feat(animation): add ParticleGemAnimation component for summarizing stage"
```

---

## Task 5: Create Gem Complete Animation Component (Stage 3)

**Files:**
- Create: `src/components/animations/GemCompleteAnimation.tsx`

**Step 1: Create the gem complete animation**

```typescript
// src/components/animations/GemCompleteAnimation.tsx
"use client";

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GemCompleteAnimationProps {
  className?: string;
  onComplete?: () => void;
}

export function GemCompleteAnimation({ className = '', onComplete }: GemCompleteAnimationProps) {
  const [showBurst, setShowBurst] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBurst(false);
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Sparkle burst (only on initial render) */}
      {showBurst && [...Array(8)].map((_, i) => {
        const angle = (i / 8) * 360;
        return (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-yellow-300"
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * 20,
              y: Math.sin((angle * Math.PI) / 180) * 20,
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.6,
              ease: 'easeOut',
            }}
          />
        );
      })}

      {/* Pulsing gem */}
      <motion.div
        className="relative"
        initial={{ scale: 0.8 }}
        animate={{ scale: [0.8, 1, 0.95, 1] }}
        transition={{
          duration: 0.6,
          times: [0, 0.3, 0.6, 1],
        }}
      >
        {/* Gem with rainbow shimmer */}
        <motion.div
          className="w-5 h-5 rotate-45 rounded-sm relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
          }}
          animate={{
            boxShadow: [
              '0 0 8px rgba(236, 72, 153, 0.6)',
              '0 0 16px rgba(139, 92, 246, 0.8)',
              '0 0 8px rgba(245, 158, 11, 0.6)',
              '0 0 16px rgba(236, 72, 153, 0.8)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 1,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/animations/GemCompleteAnimation.tsx
git commit -m "feat(animation): add GemCompleteAnimation component for ready stage"
```

---

## Task 6: Create Queue Position Indicator Component

**Files:**
- Create: `src/components/animations/QueuePositionIndicator.tsx`

**Step 1: Create the queue position indicator**

```typescript
// src/components/animations/QueuePositionIndicator.tsx
"use client";

import { motion } from 'framer-motion';

interface QueuePositionIndicatorProps {
  position: number;
  className?: string;
}

export function QueuePositionIndicator({ position, className = '' }: QueuePositionIndicatorProps) {
  const ordinal = getOrdinal(position);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Pulsing dots */}
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Position text */}
      <span className="text-xs text-muted-foreground font-medium">
        {ordinal} in queue
      </span>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
```

**Step 2: Commit**

```bash
git add src/components/animations/QueuePositionIndicator.tsx
git commit -m "feat(animation): add QueuePositionIndicator component"
```

---

## Task 7: Create Mini Loading Animation for Insights Page Tabs

**Files:**
- Create: `src/components/animations/MiniLoadingAnimation.tsx`

**Step 1: Create the mini loading animation**

```typescript
// src/components/animations/MiniLoadingAnimation.tsx
"use client";

import { motion } from 'framer-motion';

interface MiniLoadingAnimationProps {
  message: string;
  className?: string;
}

export function MiniLoadingAnimation({ message, className = '' }: MiniLoadingAnimationProps) {
  const barColors = [
    'from-purple-500 to-purple-400',
    'from-blue-500 to-blue-400',
    'from-cyan-500 to-cyan-400',
  ];

  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-12 ${className}`}>
      {/* Mini sound wave */}
      <div className="flex items-center justify-center gap-1">
        {barColors.map((color, index) => (
          <motion.div
            key={index}
            className={`w-1 rounded-full bg-gradient-to-t ${color}`}
            initial={{ height: 6 }}
            animate={{
              height: [6, 16, 10, 18, 6],
              opacity: [0.6, 1, 0.7, 1, 0.6],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.12,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Message */}
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">This usually takes a few moments</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/animations/MiniLoadingAnimation.tsx
git commit -m "feat(animation): add MiniLoadingAnimation for tab content loading"
```

---

## Task 8: Create Animation Index Export

**Files:**
- Create: `src/components/animations/index.ts`

**Step 1: Create the index export file**

```typescript
// src/components/animations/index.ts
export { SoundWaveAnimation } from './SoundWaveAnimation';
export { ParticleGemAnimation } from './ParticleGemAnimation';
export { GemCompleteAnimation } from './GemCompleteAnimation';
export { QueuePositionIndicator } from './QueuePositionIndicator';
export { MiniLoadingAnimation } from './MiniLoadingAnimation';
```

**Step 2: Commit**

```bash
git add src/components/animations/index.ts
git commit -m "feat(animation): add index export for animation components"
```

---

## Task 9: Create SummarizeButton Component

**Files:**
- Create: `src/components/SummarizeButton.tsx`

**Step 1: Create the smart summarize button**

```typescript
// src/components/SummarizeButton.tsx
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

  // Determine effective state
  const state: QueueItemState = queueItem?.state || (initialStatus === 'ready' ? 'ready' : 'idle');

  // Handle click based on state
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
        // Do nothing for processing states
        break;
    }
  };

  // Render based on state
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

  // Determine button variant
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

  // Determine if button is interactive
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
```

**Step 2: Commit**

```bash
git add src/components/SummarizeButton.tsx
git commit -m "feat(button): add SummarizeButton with queue integration and animations"
```

---

## Task 10: Create Queue Toast Component

**Files:**
- Create: `src/components/QueueToast.tsx`

**Step 1: Create the queue toast component**

```typescript
// src/components/QueueToast.tsx
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSummarizeQueue } from '@/contexts/SummarizeQueueContext';
import { CheckCircle, XCircle, X } from 'lucide-react';

export function QueueToast() {
  const { stats, clearStats, queue } = useSummarizeQueue();
  const [show, setShow] = useState(false);

  // Show toast when queue completes
  useEffect(() => {
    const isProcessing = queue.some(item =>
      ['queued', 'transcribing', 'summarizing'].includes(item.state)
    );

    // Show toast when queue is done and we have results
    if (!isProcessing && stats.total > 0 && (stats.completed > 0 || stats.failed > 0)) {
      setShow(true);
    }
  }, [queue, stats]);

  const handleDismiss = () => {
    setShow(false);
    setTimeout(clearStats, 300); // Clear after animation
  };

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (show) {
      const timer = setTimeout(handleDismiss, 8000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div className="bg-card border rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[280px]">
            {/* Icon */}
            <div className={`flex-shrink-0 ${stats.failed > 0 ? 'text-amber-500' : 'text-green-500'}`}>
              {stats.failed > 0 ? (
                <div className="relative">
                  <CheckCircle className="h-6 w-6" />
                  <XCircle className="h-3 w-3 absolute -bottom-1 -right-1 text-red-500" />
                </div>
              ) : (
                <CheckCircle className="h-6 w-6" />
              )}
            </div>

            {/* Message */}
            <div className="flex-1">
              <p className="font-medium text-sm">
                {stats.failed > 0
                  ? `${stats.completed} episode${stats.completed !== 1 ? 's' : ''} ready, ${stats.failed} failed`
                  : `${stats.completed} episode${stats.completed !== 1 ? 's' : ''} ready!`
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Click "View Summary" to see results
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/QueueToast.tsx
git commit -m "feat(toast): add QueueToast for queue completion notification"
```

---

## Task 11: Update EpisodeCard to Use SummarizeButton

**Files:**
- Modify: `src/components/EpisodeCard.tsx`

**Step 1: Update EpisodeCard**

Replace the button section in `EpisodeCard.tsx`. Change lines 132-145 from:

```typescript
          {showSummaryButton && (
            <div className="shrink-0">
              <Link href={`/episode/${episode.id}/insights`}>
                <Button
                  variant={buttonConfig.variant}
                  size="sm"
                  disabled={isProcessing ?? false}
                >
                  <ButtonIcon className={`mr-2 h-4 w-4 ${buttonConfig.spin ? 'animate-spin' : ''}`} />
                  {buttonConfig.text}
                </Button>
              </Link>
            </div>
          )}
```

To:

```typescript
          {showSummaryButton && (
            <div className="shrink-0">
              <SummarizeButton
                episodeId={episode.id}
                initialStatus={effectiveStatus === 'ready' || hasSummary ? 'ready' : effectiveStatus === 'failed' ? 'failed' : 'not_ready'}
              />
            </div>
          )}
```

Also update imports at the top. Change:

```typescript
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SummaryStatusBadge } from "./SummaryStatusBadge";
import type { EpisodeWithSummary, SummaryStatus } from "@/types/database";
import { Calendar, Clock, FileText, Sparkles, Loader2, RefreshCw, Eye } from "lucide-react";
```

To:

```typescript
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SummaryStatusBadge } from "./SummaryStatusBadge";
import { SummarizeButton } from "./SummarizeButton";
import type { EpisodeWithSummary, SummaryStatus } from "@/types/database";
import { Calendar, Clock, FileText } from "lucide-react";
```

Remove the unused `getButtonConfig` function (lines 36-76) and the unused variables `buttonConfig` and `ButtonIcon` (lines 81-82).

**Step 2: Commit**

```bash
git add src/components/EpisodeCard.tsx
git commit -m "refactor(EpisodeCard): use SummarizeButton with queue integration"
```

---

## Task 12: Update Layout with Queue Provider and Toast

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update the root layout**

Update `src/app/layout.tsx` to wrap with the queue provider and add the toast:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CountryProvider } from "@/contexts/CountryContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SummarizeQueueProvider } from "@/contexts/SummarizeQueueContext";
import { Sidebar } from "@/components/Sidebar";
import { QueueToast } from "@/components/QueueToast";
import { Agentation } from "agentation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PodCatch - AI-Powered Podcast Summaries",
  description: "Get AI-generated summaries, key points, and resources from any podcast episode",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <CountryProvider>
            <SummarizeQueueProvider>
              <div className="min-h-screen bg-background">
                <Sidebar />
                {/* Main content area - offset for sidebar on desktop, header on mobile */}
                <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
                  <div className="max-w-7xl mx-auto">
                    {children}
                  </div>
                </main>
              </div>
              <QueueToast />
            </SummarizeQueueProvider>
          </CountryProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(layout): add SummarizeQueueProvider and QueueToast to root layout"
```

---

## Task 13: Update Insights Page to Support Tab Query Param

**Files:**
- Modify: `src/app/episode/[id]/insights/page.tsx`

**Step 1: Read the current insights page**

First, read the file to understand its current structure, then update it to support the `?tab=summary` query parameter.

The page should:
1. Read the `tab` query parameter from the URL
2. Pass the initial tab to InsightHub component

**Step 2: Commit**

```bash
git add src/app/episode/[id]/insights/page.tsx
git commit -m "feat(insights): support tab query parameter for direct navigation"
```

---

## Task 14: Update InsightHub to Accept Initial Tab

**Files:**
- Modify: `src/components/InsightHub.tsx`

**Step 1: Update InsightHub props and state**

Add `initialTab` prop to InsightHub:

```typescript
interface InsightHubProps {
  episodeId: string;
  initialTab?: InsightTab;
}

export function InsightHub({ episodeId, initialTab = 'summary' }: InsightHubProps) {
  const [activeTab, setActiveTab] = useState<InsightTab>(initialTab);
  // ... rest of component
```

**Step 2: Commit**

```bash
git add src/components/InsightHub.tsx
git commit -m "feat(InsightHub): accept initialTab prop for direct tab navigation"
```

---

## Task 15: Update Tab Content Components with MiniLoadingAnimation

**Files:**
- Modify: `src/components/insights/MindmapTabContent.tsx`
- Modify: `src/components/insights/KeywordsTabContent.tsx`
- Modify: `src/components/insights/HighlightsTabContent.tsx`
- Modify: `src/components/insights/ShownotesTabContent.tsx`

**Step 1: Update each tab component**

For each tab component, update the loading/generating state to use `MiniLoadingAnimation` instead of the current loading UI.

Example for MindmapTabContent:

```typescript
import { MiniLoadingAnimation } from '@/components/animations';

// In the render, replace the loading state with:
if (isGenerating) {
  return <MiniLoadingAnimation message="Generating mindmap..." />;
}
```

**Step 2: Commit**

```bash
git add src/components/insights/MindmapTabContent.tsx
git add src/components/insights/KeywordsTabContent.tsx
git add src/components/insights/HighlightsTabContent.tsx
git add src/components/insights/ShownotesTabContent.tsx
git commit -m "feat(tabs): use MiniLoadingAnimation for processing states"
```

---

## Task 16: Final Integration Test

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Manual testing checklist**

1. Navigate to a podcast with episodes
2. Click "Summarize" on an episode - verify animation starts
3. Click "Summarize" on 2 more episodes - verify queue positions show
4. Wait for processing - verify stages progress (transcribing → summarizing → ready)
5. Verify toast appears when queue completes
6. Click "View Summary" - verify navigation to insights page with Summary tab
7. Test error case: disconnect network, retry button should appear
8. Test navigation away and back - verify state persists

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete summarize queue flow implementation

- Sound Wave → Gem animation for processing stages
- Queue system with position indicators
- Global toast on queue completion
- Silent retry with skip on failure
- MiniLoadingAnimation for incomplete insight tabs"
```

---

## Summary

This plan implements 16 tasks:

1. **Task 1-2**: Queue types and context provider
2. **Task 3-7**: Animation components (SoundWave, ParticleGem, GemComplete, QueuePosition, MiniLoading)
3. **Task 8**: Animation exports
4. **Task 9-10**: SummarizeButton and QueueToast
5. **Task 11-12**: EpisodeCard and Layout integration
6. **Task 13-15**: Insights page and tab component updates
7. **Task 16**: Integration testing

Total estimated components: 8 new files, 6 modified files
