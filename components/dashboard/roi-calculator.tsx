/**
 * ROI Calculator
 * Calculates estimated revenue per channel based on average lead value.
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import type { ChannelPerformance } from '@/lib/application/queries/dashboard.queries';

interface ROICalculatorProps {
  channelData: ChannelPerformance[];
  defaultLeadValue?: number;
  currency?: string;
}

export function ROICalculator({
  channelData,
  defaultLeadValue = 5000,
  currency = 'NOK',
}: ROICalculatorProps) {
  const [leadValue, setLeadValue] = useState(defaultLeadValue.toString());

  const numericValue = useMemo(() => {
    const parsed = parseFloat(leadValue.replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }, [leadValue]);

  const revenueData = useMemo(() => {
    return channelData.map((channel) => ({
      ...channel,
      estimatedRevenue: channel.leadCount * numericValue,
    }));
  }, [channelData, numericValue]);

  const totalRevenue = revenueData.reduce(
    (sum, ch) => sum + ch.estimatedRevenue,
    0
  );

  const maxRevenue = Math.max(...revenueData.map((d) => d.estimatedRevenue), 1);

  return (
    <Card glow>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>ROI Calculator</CardTitle>
          <Input
            value={leadValue}
            onChange={setLeadValue}
            label="Avg. Lead Value"
            suffix={currency}
            type="text"
            inputMode="numeric"
            className="w-full sm:w-48"
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Total Revenue Display */}
        <div className="mb-8 rounded-lg bg-slate-800/30 p-4">
          <p className="text-sm text-slate-500">Estimated Total Revenue</p>
          <p className="mt-1 text-3xl font-light tracking-tight text-white">
            {formatCurrency(totalRevenue, currency)}
          </p>
        </div>

        {/* Revenue by Channel */}
        {revenueData.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-slate-500">
            No channel data available
          </div>
        ) : (
          <div className="space-y-5">
            {revenueData.map((channel) => (
              <RevenueBar
                key={channel.source}
                source={channel.source}
                leadCount={channel.leadCount}
                revenue={channel.estimatedRevenue}
                maxRevenue={maxRevenue}
                currency={currency}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-6 text-xs text-slate-600">
          * Estimates based on average lead value. Actual revenue may vary based
          on conversion rates and deal sizes.
        </p>
      </CardContent>
    </Card>
  );
}

interface RevenueBarProps {
  source: string;
  leadCount: number;
  revenue: number;
  maxRevenue: number;
  currency: string;
}

function RevenueBar({
  source,
  leadCount,
  revenue,
  maxRevenue,
  currency,
}: RevenueBarProps) {
  const width = (revenue / maxRevenue) * 100;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-300">{source}</span>
          <span className="text-sm text-slate-500">
            {leadCount} {leadCount === 1 ? 'lead' : 'leads'}
          </span>
        </div>
        <span className="font-mono text-emerald-400">
          {formatCurrency(revenue, currency)}
        </span>
      </div>
      <div className="relative h-6 overflow-hidden rounded-md bg-slate-800/50">
        {/* Main bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500"
          style={{ width: `${width}%` }}
        />
        {/* Glow effect */}
        <div
          className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-emerald-600 to-emerald-500 opacity-40 blur-sm transition-all duration-500"
          style={{ width: `${width}%` }}
        />
        {/* Grid lines for visual interest */}
        <div className="absolute inset-0 flex">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-full flex-1 border-r border-slate-700/30 last:border-r-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: currency === 'NOK' ? 'NOK' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
