'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Headphones, Users, Clock, UserPlus, TrendingUp, MousePointerClick } from 'lucide-react';
import dynamic from 'next/dynamic';
import { StatCard } from '@/components/admin/StatCard';
import { ChartCard } from '@/components/admin/ChartCard';
import { DataTable } from '@/components/admin/DataTable';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { PeriodSelector } from '@/components/analytics/PeriodSelector';
import type { PodcastAnalytics, AnalyticsPeriod } from '@/types/analytics';

const AreaChartWidget = dynamic(() => import('@/components/admin/charts/AreaChartWidget').then(m => ({ default: m.AreaChartWidget })), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl" /> });
const PieChartWidget = dynamic(() => import('@/components/admin/charts/PieChartWidget').then(m => ({ default: m.PieChartWidget })), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl" /> });

export default function PodcastAnalyticsPage() {
  const params = useParams();
  const podcastId = params.id as string;
  const [data, setData] = useState<PodcastAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/podcasts/${podcastId}/analytics?period=${period}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [podcastId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>;
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Podcast Analytics</h1>
        <div className="flex items-center gap-3">
          <PeriodSelector value={period} onChange={setPeriod} />
          <RefreshButton onClick={fetchData} isLoading={loading} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Headphones} label="Plays" value={data.totalPlays.toLocaleString()} />
        <StatCard icon={Users} label="Listeners" value={data.uniqueListeners.toLocaleString()} />
        <StatCard icon={Clock} label="Listen Hours" value={data.totalListenHours.toLocaleString()} />
        <StatCard icon={UserPlus} label="Followers" value={data.followerCount.toLocaleString()} />
        <StatCard icon={TrendingUp} label="New Followers" value={`+${data.followerGrowth}`} />
        <StatCard icon={MousePointerClick} label="Imp→Play %" value={`${data.impressionToPlayRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Plays Over Time">
          <AreaChartWidget data={data.playsOverTime} />
        </ChartCard>
        <ChartCard title="Listeners Over Time">
          <AreaChartWidget data={data.listenersOverTime} color="hsl(180, 70%, 45%)" />
        </ChartCard>
      </div>

      <ChartCard title="Discovery Sources">
        <PieChartWidget data={data.discoverySources} />
      </ChartCard>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Top Episodes</h2>
        <DataTable
          columns={[
            { key: 'title', label: 'Episode' },
            { key: 'plays', label: 'Plays', sortable: true },
            { key: 'listeners', label: 'Listeners', sortable: true },
            {
              key: 'avg_duration',
              label: 'Avg Duration',
              sortable: true,
              render: (row) => {
                const val = (row as Record<string, number>).avg_duration;
                const mins = Math.floor(val / 60);
                const secs = val % 60;
                return `${mins}m ${secs}s`;
              },
            },
            {
              key: 'completion_rate',
              label: 'Completion %',
              sortable: true,
              render: (row) => `${(row as Record<string, number>).completion_rate}%`,
            },
          ]}
          data={data.topEpisodes as unknown as Record<string, unknown>[]}
        />
      </div>
    </div>
  );
}
