'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Headphones, Users, Clock, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { StatCard } from '@/components/admin/StatCard';
import { ChartCard } from '@/components/admin/ChartCard';
import { RefreshButton } from '@/components/admin/RefreshButton';
import type { EpisodeAnalytics } from '@/types/analytics';

const AreaChartWidget = dynamic(() => import('@/components/admin/charts/AreaChartWidget').then(m => ({ default: m.AreaChartWidget })), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl" /> });
const PieChartWidget = dynamic(() => import('@/components/admin/charts/PieChartWidget').then(m => ({ default: m.PieChartWidget })), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl" /> });
const RetentionChart = dynamic(() => import('@/components/analytics/RetentionChart').then(m => ({ default: m.RetentionChart })), { ssr: false, loading: () => <div className="h-[300px] animate-pulse bg-white/5 rounded-xl" /> });
const PerformanceComparison = dynamic(() => import('@/components/analytics/PerformanceComparison').then(m => ({ default: m.PerformanceComparison })), { ssr: false, loading: () => <div className="h-[250px] animate-pulse bg-white/5 rounded-xl" /> });

export default function EpisodeAnalyticsPage() {
  const params = useParams();
  const episodeId = params.id as string;
  const [data, setData] = useState<EpisodeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/analytics`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>;
  }
  if (!data) return null;

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Episode Analytics</h1>
        <RefreshButton onClick={fetchData} isLoading={loading} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Headphones} label="Plays" value={data.totalPlays.toLocaleString()} />
        <StatCard icon={Users} label="Listeners" value={data.uniqueListeners.toLocaleString()} />
        <StatCard icon={Clock} label="Avg Duration" value={formatDuration(data.avgListenDuration)} />
        <StatCard icon={CheckCircle} label="Completion %" value={`${data.completionRate}%`} />
      </div>

      <ChartCard title="Listener Retention">
        <RetentionChart data={data.retentionCurve} />
      </ChartCard>

      <ChartCard title="Performance vs Podcast Average">
        <PerformanceComparison data={data.performanceVsAvg} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Plays Over Time">
          <AreaChartWidget data={data.playsOverTime} />
        </ChartCard>
        <ChartCard title="Discovery Sources">
          <PieChartWidget data={data.discoverySources} />
        </ChartCard>
      </div>
    </div>
  );
}
