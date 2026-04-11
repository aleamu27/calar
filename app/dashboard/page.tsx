/**
 * Oracle Dashboard - Main Page
 * Server Component that fetches and displays analytics data.
 */

import { Suspense } from 'react';
import {
  getKPIMetrics,
  getLeadsWithAttribution,
  getChannelPerformance,
  getLeadTrend,
  type DateRange,
} from '@/lib/application/queries/dashboard.queries';
import {
  KPICards,
  DateRangeFilter,
  AttributionTable,
  ChannelChart,
  ROICalculator,
  LeadTrendChart,
} from '@/components/dashboard';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardPageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const range = validateDateRange(params.range);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Track your lead generation and attribution performance.
          </p>
        </div>
        <Suspense fallback={<FilterSkeleton />}>
          <DateRangeFilter value={range} />
        </Suspense>
      </div>

      {/* KPI Cards */}
      <Suspense fallback={<KPISkeleton />}>
        <KPISection range={range} />
      </Suspense>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <TrendSection range={range} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <ChannelSection range={range} />
        </Suspense>
      </div>

      {/* ROI Calculator */}
      <Suspense fallback={<ChartSkeleton />}>
        <ROISection range={range} />
      </Suspense>

      {/* Attribution Table */}
      <Suspense fallback={<TableSkeleton />}>
        <TableSection range={range} />
      </Suspense>
    </div>
  );
}

// ============================================================================
// DATA SECTIONS (Server Components)
// ============================================================================

async function KPISection({ range }: { range: DateRange }) {
  const metrics = await getKPIMetrics(range);
  return <KPICards metrics={metrics} />;
}

async function TrendSection({ range }: { range: DateRange }) {
  const trend = await getLeadTrend(range);
  return <LeadTrendChart data={trend} />;
}

async function ChannelSection({ range }: { range: DateRange }) {
  const channels = await getChannelPerformance(range);
  return <ChannelChart data={channels} />;
}

async function ROISection({ range }: { range: DateRange }) {
  const channels = await getChannelPerformance(range);
  return <ROICalculator channelData={channels} />;
}

async function TableSection({ range }: { range: DateRange }) {
  const { data, total } = await getLeadsWithAttribution(range);
  return <AttributionTable leads={data} total={total} />;
}

// ============================================================================
// LOADING SKELETONS
// ============================================================================

function FilterSkeleton() {
  return (
    <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-800/50" />
  );
}

function KPISkeleton() {
  return (
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
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
        <div className="mt-6 h-48 animate-pulse rounded bg-slate-800/50" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
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
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function validateDateRange(value?: string): DateRange {
  const valid: DateRange[] = ['7d', '30d', '90d', 'all'];
  if (value && valid.includes(value as DateRange)) {
    return value as DateRange;
  }
  return '30d';
}
