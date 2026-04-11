/**
 * Lead Trend Chart
 * Sparkline-style area chart showing leads over time.
 */

import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import type { LeadTrend } from '@/lib/application/queries/dashboard.queries';

interface LeadTrendChartProps {
  data: LeadTrend[];
}

export function LeadTrendChart({ data }: LeadTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-slate-500">
            No trend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalLeads = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lead Trend</CardTitle>
          <span className="text-sm text-slate-500">
            {totalLeads} leads over {data.length} periods
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-48">
          {/* SVG Chart */}
          <svg
            className="h-full w-full"
            viewBox={`0 0 ${data.length * 60} 200`}
            preserveAspectRatio="none"
          >
            {/* Gradient definition */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(99, 102, 241)" />
                <stop offset="100%" stopColor="rgb(139, 92, 246)" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                y1={200 - ratio * 180}
                x2={data.length * 60}
                y2={200 - ratio * 180}
                stroke="rgb(51, 65, 85)"
                strokeOpacity="0.3"
                strokeDasharray="4"
              />
            ))}

            {/* Area fill */}
            <path
              d={generateAreaPath(data, maxCount)}
              fill="url(#areaGradient)"
            />

            {/* Line */}
            <path
              d={generateLinePath(data, maxCount)}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {data.map((point, index) => {
              const x = index * 60 + 30;
              const y = 200 - (point.count / maxCount) * 180 - 10;
              return (
                <g key={point.date}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="rgb(99, 102, 241)"
                    className="transition-all duration-200 hover:r-6"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="rgb(99, 102, 241)"
                    fillOpacity="0.2"
                  />
                </g>
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div className="mt-4 flex justify-between text-xs text-slate-500">
            {data.slice(0, Math.min(data.length, 7)).map((point, index) => (
              <span key={index} className="truncate px-1">
                {formatDateLabel(point.date)}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function generateLinePath(data: LeadTrend[], maxCount: number): string {
  const points = data.map((point, index) => {
    const x = index * 60 + 30;
    const y = 200 - (point.count / maxCount) * 180 - 10;
    return `${x},${y}`;
  });

  return `M ${points.join(' L ')}`;
}

function generateAreaPath(data: LeadTrend[], maxCount: number): string {
  const width = data.length * 60;
  const points = data.map((point, index) => {
    const x = index * 60 + 30;
    const y = 200 - (point.count / maxCount) * 180 - 10;
    return `${x},${y}`;
  });

  return `M 30,200 L ${points.join(' L ')} L ${width - 30},200 Z`;
}

function formatDateLabel(date: string): string {
  // Handle both YYYY-MM-DD and YYYY-WXX formats
  if (date.includes('W')) {
    return date.slice(-3); // Just show "W01" etc.
  }
  return date.slice(5); // Show "MM-DD"
}
