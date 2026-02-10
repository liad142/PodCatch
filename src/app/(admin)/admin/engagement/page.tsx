'use client';

import { useState, useEffect, useCallback } from 'react';
import { Radio, Youtube, Bookmark } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { ChartCard } from '@/components/admin/ChartCard';
import { DataTable } from '@/components/admin/DataTable';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { AreaChartWidget } from '@/components/admin/charts/AreaChartWidget';
import { PieChartWidget } from '@/components/admin/charts/PieChartWidget';
import type { EngagementAnalytics } from '@/types/admin';

export default function EngagementPage() {
  const [data, setData] = useState<EngagementAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/engagement');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Engagement</h1>
        <RefreshButton onClick={fetchData} isLoading={loading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Radio} label="Subscriptions" value={data.totalSubscriptions} />
        <StatCard icon={Youtube} label="YouTube Follows" value={data.totalFollows} />
        <StatCard icon={Bookmark} label="Bookmarks" value={data.totalBookmarks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Subscriptions Over Time">
          <AreaChartWidget data={data.subscriptionsOverTime} />
        </ChartCard>
        <ChartCard title="Follows Over Time">
          <AreaChartWidget data={data.followsOverTime} color="hsl(0, 70%, 55%)" />
        </ChartCard>
      </div>

      <ChartCard title="Feed Items by Source">
        <PieChartWidget data={data.feedItemsBySource} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Top Subscribed Podcasts</h2>
          <DataTable
            columns={[
              { key: 'title', label: 'Podcast' },
              { key: 'subscriber_count', label: 'Subscribers', sortable: true },
            ]}
            data={data.topSubscribed as unknown as Record<string, unknown>[]}
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Top Followed Channels</h2>
          <DataTable
            columns={[
              { key: 'title', label: 'Channel' },
              { key: 'follower_count', label: 'Followers', sortable: true },
            ]}
            data={data.topFollowed as unknown as Record<string, unknown>[]}
          />
        </div>
      </div>
    </div>
  );
}
