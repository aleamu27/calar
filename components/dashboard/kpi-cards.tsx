/**
 * KPI Cards
 * High-level metrics display for the dashboard header.
 */

import { Card, CardContent, CardTitle, CardValue } from '../ui/card';
import type { KPIMetrics } from '@/lib/application/queries/dashboard.queries';

interface KPICardsProps {
  metrics: KPIMetrics;
}

export function KPICards({ metrics }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Leads */}
      <Card glow>
        <CardContent>
          <CardTitle>Total Leads</CardTitle>
          <div className="mt-3">
            <CardValue trend={metrics.leadsChange}>
              {metrics.totalLeads.toLocaleString()}
            </CardValue>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            vs. previous period
          </p>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card>
        <CardContent>
          <CardTitle>Conversion Rate</CardTitle>
          <div className="mt-3">
            <CardValue>{metrics.conversionRate}%</CardValue>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {metrics.totalVisitors.toLocaleString()} total visitors
          </p>
        </CardContent>
      </Card>

      {/* Top Channel */}
      <Card>
        <CardContent>
          <CardTitle>Top Channel</CardTitle>
          <div className="mt-3">
            {metrics.topChannel ? (
              <>
                <CardValue>{metrics.topChannel.source}</CardValue>
                <p className="mt-2 text-sm text-slate-500">
                  {metrics.topChannel.count} leads generated
                </p>
              </>
            ) : (
              <>
                <span className="text-2xl font-light text-slate-600">—</span>
                <p className="mt-2 text-sm text-slate-500">No attribution data</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visitors */}
      <Card>
        <CardContent>
          <CardTitle>Unique Visitors</CardTitle>
          <div className="mt-3">
            <CardValue>{metrics.totalVisitors.toLocaleString()}</CardValue>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            tracked this period
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
