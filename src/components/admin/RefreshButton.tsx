'use client';

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}

export function RefreshButton({ onClick, isLoading, className }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50',
        className
      )}
      aria-label="Refresh data"
    >
      <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
    </button>
  );
}
