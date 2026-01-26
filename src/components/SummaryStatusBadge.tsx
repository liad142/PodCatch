"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import type { SummaryStatus } from "@/types/database";

interface SummaryStatusBadgeProps {
  status: SummaryStatus | null;
  size?: "sm" | "md";
}

export function SummaryStatusBadge({ status, size = "sm" }: SummaryStatusBadgeProps) {
  if (!status || status === 'not_ready') {
    return null;
  }

  const config = {
    queued: { label: 'Queued', icon: Clock, variant: 'secondary' as const, spin: false },
    transcribing: { label: 'Transcribing...', icon: Loader2, variant: 'secondary' as const, spin: true },
    summarizing: { label: 'Summarizing...', icon: Loader2, variant: 'secondary' as const, spin: true },
    ready: { label: 'Summary Ready', icon: CheckCircle, variant: 'default' as const, spin: false },
    failed: { label: 'Failed', icon: XCircle, variant: 'destructive' as const, spin: false },
  };

  const { label, icon: Icon, variant, spin } = config[status] ?? config.queued;

  return (
    <Badge variant={variant} className={size === 'sm' ? 'text-xs' : ''}>
      <Icon className={`mr-1 h-3 w-3 ${spin ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
}
