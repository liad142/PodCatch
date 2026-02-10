'use client';

import { cn } from '@/lib/utils';

interface StatusBreakdownProps {
  items: { label: string; value: number; color: string }[];
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  ready: 'bg-green-500',
  queued: 'bg-yellow-500',
  transcribing: 'bg-blue-500',
  summarizing: 'bg-blue-400',
  failed: 'bg-red-500',
  pending: 'bg-gray-400',
};

export function StatusBreakdown({ items, className }: StatusBreakdownProps) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(item.color || STATUS_COLORS[item.label] || 'bg-gray-400')}
            style={{ width: `${(item.value / total) * 100}%` }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={cn('h-2.5 w-2.5 rounded-full', item.color || STATUS_COLORS[item.label] || 'bg-gray-400')} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
