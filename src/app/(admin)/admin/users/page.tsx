'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { ChartCard } from '@/components/admin/ChartCard';
import { DataTable } from '@/components/admin/DataTable';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { AreaChartWidget } from '@/components/admin/charts/AreaChartWidget';
import { BarChartWidget } from '@/components/admin/charts/BarChartWidget';
import { PieChartWidget } from '@/components/admin/charts/PieChartWidget';
import type { UserAnalytics } from '@/types/admin';

export default function UsersPage() {
  const [data, setData] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
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
        <h1 className="text-2xl font-bold">Users</h1>
        <RefreshButton onClick={fetchData} isLoading={loading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={data.totalUsers} />
        <StatCard icon={UserPlus} label="This Week" value={data.usersThisWeek} />
        <StatCard icon={CheckCircle} label="Onboarding %" value={`${data.onboardingRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Signups Over Time">
          <AreaChartWidget data={data.signupsOverTime} />
        </ChartCard>
        <ChartCard title="Genre Preferences">
          <BarChartWidget data={data.genreDistribution} />
        </ChartCard>
      </div>

      <ChartCard title="Country Distribution">
        <PieChartWidget data={data.countryDistribution} />
      </ChartCard>

      <h2 className="text-lg font-semibold">Recent Signups</h2>
      <DataTable
        columns={[
          { key: 'display_name', label: 'Name', render: (row) => (row.display_name as string) || '—' },
          { key: 'email', label: 'Email' },
          {
            key: 'onboarding_completed',
            label: 'Onboarded',
            render: (row) => row.onboarding_completed ? 'Yes' : 'No',
          },
          {
            key: 'created_at',
            label: 'Joined',
            sortable: true,
            render: (row) => new Date(row.created_at as string).toLocaleDateString(),
          },
        ]}
        data={data.recentUsers as unknown as Record<string, unknown>[]}
      />
    </div>
  );
}
