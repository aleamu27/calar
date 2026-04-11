/**
 * Dashboard Queries
 * Server-side data aggregation for the Oracle Dashboard.
 * All queries are optimized for dashboard performance.
 */

import { sql, eq, gte, and, count, countDistinct, desc, isNotNull } from 'drizzle-orm';
import { db } from '../../infrastructure/db/client';
import { visitors, attributions, leads } from '../../infrastructure/db/schema';

export type DateRange = '7d' | '30d' | '90d' | 'all';

function getDateFilter(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.setDate(now.getDate() - 7));
    case '30d':
      return new Date(now.setDate(now.getDate() - 30));
    case '90d':
      return new Date(now.setDate(now.getDate() - 90));
    case 'all':
      return null;
  }
}

// ============================================================================
// KPI QUERIES
// ============================================================================

export interface KPIMetrics {
  totalLeads: number;
  totalVisitors: number;
  conversionRate: number;
  topChannel: {
    source: string;
    count: number;
  } | null;
  leadsChange: number; // percentage change from previous period
}

export async function getKPIMetrics(range: DateRange): Promise<KPIMetrics> {
  const dateFilter = getDateFilter(range);

  // Total leads in period
  const leadsQuery = dateFilter
    ? db
        .select({ count: count() })
        .from(leads)
        .where(gte(leads.convertedAt, dateFilter))
    : db.select({ count: count() }).from(leads);

  const [leadsResult] = await leadsQuery;
  const totalLeads = leadsResult?.count ?? 0;

  // Total unique visitors in period
  const visitorsQuery = dateFilter
    ? db
        .select({ count: countDistinct(visitors.id) })
        .from(visitors)
        .where(gte(visitors.firstSeenAt, dateFilter))
    : db.select({ count: countDistinct(visitors.id) }).from(visitors);

  const [visitorsResult] = await visitorsQuery;
  const totalVisitors = visitorsResult?.count ?? 0;

  // Conversion rate
  const conversionRate =
    totalVisitors > 0 ? (totalLeads / totalVisitors) * 100 : 0;

  // Top channel by lead count
  const topChannelQuery = db
    .select({
      source: attributions.utmSource,
      count: count(),
    })
    .from(leads)
    .innerJoin(attributions, eq(leads.visitorId, attributions.visitorId))
    .where(
      and(
        isNotNull(attributions.utmSource),
        dateFilter ? gte(leads.convertedAt, dateFilter) : undefined
      )
    )
    .groupBy(attributions.utmSource)
    .orderBy(desc(count()))
    .limit(1);

  const [topChannelResult] = await topChannelQuery;
  const topChannel = topChannelResult?.source
    ? { source: topChannelResult.source, count: topChannelResult.count }
    : null;

  // Calculate change from previous period
  const leadsChange = await calculatePeriodChange(range);

  return {
    totalLeads,
    totalVisitors,
    conversionRate: Math.round(conversionRate * 100) / 100,
    topChannel,
    leadsChange,
  };
}

async function calculatePeriodChange(range: DateRange): Promise<number> {
  if (range === 'all') return 0;

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const now = new Date();
  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(
    currentStart.getTime() - days * 24 * 60 * 60 * 1000
  );

  const [currentPeriod] = await db
    .select({ count: count() })
    .from(leads)
    .where(gte(leads.convertedAt, currentStart));

  const [previousPeriod] = await db
    .select({ count: count() })
    .from(leads)
    .where(
      and(
        gte(leads.convertedAt, previousStart),
        sql`${leads.convertedAt} < ${currentStart}`
      )
    );

  const current = currentPeriod?.count ?? 0;
  const previous = previousPeriod?.count ?? 0;

  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ============================================================================
// ATTRIBUTION TABLE QUERY
// ============================================================================

export interface DashboardLead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  convertedAt: Date;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  landingPage: string | null;
}

export async function getLeadsWithAttribution(
  range: DateRange,
  limit = 50,
  offset = 0
): Promise<{ data: DashboardLead[]; total: number }> {
  const dateFilter = getDateFilter(range);

  const baseCondition = dateFilter
    ? gte(leads.convertedAt, dateFilter)
    : undefined;

  const data = await db
    .select({
      id: leads.id,
      email: leads.email,
      name: leads.name,
      company: leads.company,
      convertedAt: leads.convertedAt,
      utmSource: attributions.utmSource,
      utmMedium: attributions.utmMedium,
      utmCampaign: attributions.utmCampaign,
      referrer: attributions.referrer,
      landingPage: attributions.landingPage,
    })
    .from(leads)
    .leftJoin(attributions, eq(leads.visitorId, attributions.visitorId))
    .where(baseCondition)
    .orderBy(desc(leads.convertedAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(leads)
    .where(baseCondition);

  return {
    data,
    total: totalResult?.count ?? 0,
  };
}

// ============================================================================
// CHANNEL PERFORMANCE QUERY (for ROI Calculator)
// ============================================================================

export interface ChannelPerformance {
  source: string;
  leadCount: number;
  percentage: number;
}

export async function getChannelPerformance(
  range: DateRange
): Promise<ChannelPerformance[]> {
  const dateFilter = getDateFilter(range);

  const channelData = await db
    .select({
      source: sql<string>`COALESCE(${attributions.utmSource}, 'Direct')`,
      leadCount: count(),
    })
    .from(leads)
    .leftJoin(attributions, eq(leads.visitorId, attributions.visitorId))
    .where(dateFilter ? gte(leads.convertedAt, dateFilter) : undefined)
    .groupBy(sql`COALESCE(${attributions.utmSource}, 'Direct')`)
    .orderBy(desc(count()));

  const total = channelData.reduce((sum, ch) => sum + ch.leadCount, 0);

  return channelData.map((channel) => ({
    source: channel.source,
    leadCount: channel.leadCount,
    percentage: total > 0 ? Math.round((channel.leadCount / total) * 100) : 0,
  }));
}

// ============================================================================
// LEADS OVER TIME (for trend chart)
// ============================================================================

export interface LeadTrend {
  date: string;
  count: number;
}

export async function getLeadTrend(range: DateRange): Promise<LeadTrend[]> {
  const dateFilter = getDateFilter(range);
  const groupBy = range === '7d' ? 'day' : range === '30d' ? 'day' : 'week';

  const dateFormat =
    groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-"W"IW';

  const trendData = await db
    .select({
      date: sql<string>`TO_CHAR(${leads.convertedAt}, ${dateFormat})`,
      count: count(),
    })
    .from(leads)
    .where(dateFilter ? gte(leads.convertedAt, dateFilter) : undefined)
    .groupBy(sql`TO_CHAR(${leads.convertedAt}, ${dateFormat})`)
    .orderBy(sql`TO_CHAR(${leads.convertedAt}, ${dateFormat})`);

  return trendData;
}
