/**
 * Dashboard Loading State
 * Full-page skeleton while dashboard data loads.
 */

import { Card, CardContent } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-800/50" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-800/50" />
      </div>

      {/* KPI skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent>
              <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
              <div className="mt-4 h-10 w-32 animate-pulse rounded bg-slate-800" />
              <div className="mt-2 h-4 w-20 animate-pulse rounded bg-slate-800/50" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
              <div className="mt-6 h-48 animate-pulse rounded bg-slate-800/50" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ROI skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
          <div className="mt-6 h-32 animate-pulse rounded bg-slate-800/50" />
        </CardContent>
      </Card>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
          <div className="mt-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded bg-slate-800/50"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
