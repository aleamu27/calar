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

  // Top channel by lead count - use raw SQL to avoid GROUP BY issues
  const topChannelResult = await db.execute<{ source: string; count: string }>(sql`
    SELECT a.utm_source as source, COUNT(*)::text as count
    FROM leads l
    INNER JOIN attributions a ON l.visitor_id = a.visitor_id
    WHERE a.utm_source IS NOT NULL
    ${dateFilter ? sql`AND l.converted_at >= ${dateFilter}` : sql``}
    GROUP BY a.utm_source
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `);

  const topChannel = topChannelResult.rows[0]?.source
    ? { source: topChannelResult.rows[0].source, count: parseInt(topChannelResult.rows[0].count, 10) }
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

  // Use raw SQL to avoid GROUP BY issues with Drizzle
  const channelData = await db.execute<{ source: string; lead_count: string }>(sql`
    SELECT
      COALESCE(a.utm_source, 'Direct') as source,
      COUNT(*)::text as lead_count
    FROM leads l
    LEFT JOIN attributions a ON l.visitor_id = a.visitor_id
    ${dateFilter ? sql`WHERE l.converted_at >= ${dateFilter}` : sql``}
    GROUP BY COALESCE(a.utm_source, 'Direct')
    ORDER BY COUNT(*) DESC
  `);

  const total = channelData.rows.reduce((sum, ch) => sum + parseInt(ch.lead_count, 10), 0);

  return channelData.rows.map((channel) => ({
    source: channel.source,
    leadCount: parseInt(channel.lead_count, 10),
    percentage: total > 0 ? Math.round((parseInt(channel.lead_count, 10) / total) * 100) : 0,
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

  const dateFormat = groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-"W"IW';

  // Use raw SQL to ensure consistent date expression
  const trendData = await db.execute<{ date: string; count: string }>(sql`
    SELECT
      TO_CHAR(converted_at, ${dateFormat}) as date,
      COUNT(*)::text as count
    FROM leads
    ${dateFilter ? sql`WHERE converted_at >= ${dateFilter}` : sql``}
    GROUP BY TO_CHAR(converted_at, ${dateFormat})
    ORDER BY TO_CHAR(converted_at, ${dateFormat})
  `);

  return trendData.rows.map((row) => ({
    date: row.date,
    count: parseInt(row.count, 10),
  }));
}
