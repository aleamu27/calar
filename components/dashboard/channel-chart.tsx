/**
 * Channel Performance Chart
 * Bar chart showing lead distribution by source.
 */

import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import type { ChannelPerformance } from '@/lib/application/queries/dashboard.queries';

interface ChannelChartProps {
  data: ChannelPerformance[];
}

export function ChannelChart({ data }: ChannelChartProps) {
  const maxCount = Math.max(...data.map((d) => d.leadCount), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads by Channel</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-slate-500">
            No channel data available
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((channel, index) => (
              <ChannelBar
                key={channel.source}
                source={channel.source}
                count={channel.leadCount}
                percentage={channel.percentage}
                maxCount={maxCount}
                rank={index}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ChannelBarProps {
  source: string;
  count: number;
  percentage: number;
  maxCount: number;
  rank: number;
}

function ChannelBar({ source, count, percentage, maxCount, rank }: ChannelBarProps) {
  const width = (count / maxCount) * 100;
  const colors = getBarColor(rank);

  return (
    <div className="group">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-300">{source}</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-500">{percentage}%</span>
          <span className="min-w-[3rem] text-right font-mono text-slate-400">
            {count}
          </span>
        </div>
      </div>
      <div className="relative h-8 overflow-hidden rounded-md bg-slate-800/50">
        <div
          className={`
            absolute inset-y-0 left-0 rounded-md transition-all duration-500
            ${colors}
          `}
          style={{ width: `${width}%` }}
        />
        {/* Subtle glow effect */}
        <div
          className={`
            absolute inset-y-0 left-0 rounded-md opacity-50 blur-sm
            ${colors}
          `}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function getBarColor(rank: number): string {
  const colors = [
    'bg-gradient-to-r from-indigo-600 to-indigo-500',
    'bg-gradient-to-r from-violet-600 to-violet-500',
    'bg-gradient-to-r from-purple-600 to-purple-500',
    'bg-gradient-to-r from-fuchsia-600 to-fuchsia-500',
    'bg-gradient-to-r from-pink-600 to-pink-500',
  ];
  return colors[rank % colors.length];
}
