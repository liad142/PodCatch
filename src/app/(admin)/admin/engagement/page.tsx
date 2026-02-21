'use client';

import { useState, useEffect, useCallback } from 'react';
import { Radio, Youtube, Bookmark, Headphones, Clock, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { StatCard } from '@/components/admin/StatCard';
import { ChartCard } from '@/components/admin/ChartCard';
import { DataTable } from '@/components/admin/DataTable';
import { RefreshButton } from '@/components/admin/RefreshButton';

const AreaChartWidget = dynamic(() => import('@/components/admin/charts/AreaChartWidget').then(m => ({ default: m.AreaChartWidget })), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl" /> });
const PieChartWidget = dynamic(() => import('@/components/admin/charts/PieChartWidget').then(m => ({ default: m.PieChartWidget })), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl" /> });
import type { EngagementAnalytics } from '@/types/admin';
import type { SystemPlayAnalytics } from '@/types/analytics';

export default function EngagementPage() {
  const [data, setData] = useState<EngagementAnalytics | null>(null);
  const [playData, setPlayData] = useState<SystemPlayAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [engRes, playRes] = await Promise.all([
        fetch('/api/admin/engagement'),
        fetch('/api/admin/analytics'),
      ]);
      if (engRes.ok) setData(await engRes.json());
      if (playRes.ok) setPlayData(await playRes.json());
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

      {/* Play Metrics Section */}
      {playData && (
        <>
          <h2 className="text-lg font-semibold">Play Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Headphones} label="Total Plays" value={playData.totalPlays.toLocaleString()} />
            <StatCard icon={Clock} label="Listen Hours" value={playData.totalListenHours.toLocaleString()} />
            <StatCard icon={Users} label="Unique Listeners" value={playData.uniqueListeners.toLocaleString()} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Plays Over Time (30d)">
              <AreaChartWidget data={playData.playsOverTime} color="hsl(270, 70%, 55%)" />
            </ChartCard>
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Top Podcasts by Plays</h3>
              <DataTable
                columns={[
                  { key: 'title', label: 'Podcast' },
                  { key: 'plays', label: 'Plays', sortable: true },
                ]}
                data={playData.topPodcastsByPlays as unknown as Record<string, unknown>[]}
              />
            </div>
          </div>
        </>
      )}

      {/* Original Engagement Metrics */}
      <h2 className="text-lg font-semibold pt-2">Subscriptions & Follows</h2>
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
