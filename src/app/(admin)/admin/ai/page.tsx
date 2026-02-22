'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Brain, Layers, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { StatCard } from '@/components/admin/StatCard';
import { ChartCard } from '@/components/admin/ChartCard';
import { DataTable } from '@/components/admin/DataTable';
import { RefreshButton } from '@/components/admin/RefreshButton';

const AreaChartWidget = dynamic(() => import('@/components/admin/charts/AreaChartWidget').then(m => ({ default: m.AreaChartWidget })), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl" /> });
const StatusBreakdown = dynamic(() => import('@/components/admin/charts/StatusBreakdown').then(m => ({ default: m.StatusBreakdown })), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl" /> });
import type { AiAnalytics } from '@/types/admin';

export default function AiPage() {
  const [data, setData] = useState<AiAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>;
  }
  if (!data) return null;

  // Build status breakdown from summariesByLevelAndStatus
  const summaryStatusTotals: Record<string, number> = {};
  data.summariesByLevelAndStatus.forEach(s => {
    summaryStatusTotals[s.status] = (summaryStatusTotals[s.status] || 0) + s.count;
  });

  const statusColors: Record<string, string> = {
    ready: 'bg-green-500',
    queued: 'bg-yellow-500',
    transcribing: 'bg-blue-500',
    summarizing: 'bg-blue-400',
    failed: 'bg-red-500',
    not_ready: 'bg-gray-400',
  };

  const summaryBreakdown = Object.entries(summaryStatusTotals).map(([label, value]) => ({
    label,
    value,
    color: statusColors[label] || 'bg-gray-400',
  }));

  const transcriptBreakdown = data.transcriptsByStatus.map(t => ({
    label: t.label,
    value: t.count,
    color: statusColors[t.label] || 'bg-gray-400',
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Pipeline</h1>
        <RefreshButton onClick={fetchData} isLoading={loading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Summaries" value={data.totalSummaries} />
        <StatCard icon={Brain} label="Total Transcripts" value={data.totalTranscripts} />
        <StatCard icon={Layers} label="Queue Depth" value={data.queueDepth} />
        <StatCard icon={AlertTriangle} label="Failure Rate" value={`${data.failureRate}%`} />
      </div>

      <ChartCard title="Generation Over Time (completed summaries)">
        <AreaChartWidget data={data.generationOverTime} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Summary Status">
          <StatusBreakdown items={summaryBreakdown} />
        </ChartCard>
        <ChartCard title="Transcript Status">
          <StatusBreakdown items={transcriptBreakdown} />
        </ChartCard>
      </div>

      <h2 className="text-lg font-semibold">Recent Failures</h2>
      <DataTable
        columns={[
          { key: 'type', label: 'Type' },
          { key: 'episode_title', label: 'Episode', render: (row) => {
            const title = row.episode_title as string;
            return title.length > 50 ? title.slice(0, 50) + '...' : title;
          }},
          { key: 'error_message', label: 'Error', render: (row) => {
            const msg = (row.error_message as string) || 'Unknown';
            return <span className="text-red-600 dark:text-red-400 text-xs">{msg.length > 80 ? msg.slice(0, 80) + '...' : msg}</span>;
          }},
          {
            key: 'failed_at',
            label: 'Time',
            sortable: true,
            render: (row) => new Date(row.failed_at as string).toLocaleString(),
          },
        ]}
        data={data.recentFailures as unknown as Record<string, unknown>[]}
      />
    </div>
  );
}
