'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { TimeSeriesPoint } from '@/types/admin';

interface AreaChartWidgetProps {
  data: TimeSeriesPoint[];
  height?: number;
  color?: string;
  secondarySeries?: { data: TimeSeriesPoint[]; color: string; label: string };
}

export function AreaChartWidget({ data, height = 250, color = 'hsl(var(--primary))', secondarySeries }: AreaChartWidgetProps) {
  // Merge primary + secondary data by date if secondary exists
  const merged = secondarySeries
    ? data.map(d => {
        const sec = secondarySeries.data.find(s => s.date === d.date);
        return { date: d.date, value: d.value, secondary: sec?.value ?? 0 };
      })
    : data;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={merged} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {secondarySeries && (
            <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={secondarySeries.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={secondarySeries.color} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelFormatter={v => new Date(v).toLocaleDateString()}
        />
        <Area type="monotone" dataKey="value" stroke={color} fill="url(#colorPrimary)" strokeWidth={2} />
        {secondarySeries && (
          <Area type="monotone" dataKey="secondary" stroke={secondarySeries.color} fill="url(#colorSecondary)" strokeWidth={2} name={secondarySeries.label} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
