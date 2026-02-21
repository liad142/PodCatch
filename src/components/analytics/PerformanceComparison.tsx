'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceComparisonProps {
  data: {
    metric: string;
    episode: number;
    podcastAvg: number;
  }[];
}

export function PerformanceComparison({ data }: PerformanceComparisonProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis dataKey="metric" />
        <YAxis />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Bar dataKey="episode" name="This Episode" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="podcastAvg" name="Podcast Avg" fill="hsl(var(--muted-foreground) / 0.4)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
