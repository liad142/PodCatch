'use client';

import { cn } from '@/lib/utils';
import { glass } from '@/lib/glass';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <div className={cn(glass.card, 'rounded-xl p-5', className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}
