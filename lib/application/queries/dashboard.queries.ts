/**
 * Dashboard Queries v3.0
 * Server-side data aggregation for the Oracle Dashboard.
 * Uses raw PostgreSQL queries - completely bypasses Drizzle ORM.
 * BUILD: 2026-04-11-v3
 */

import { rawQuery } from '../../infrastructure/db/client';

// Version marker for debugging deployment issues
console.log('[Dashboard Queries] Version 3.0 - Pure PostgreSQL');

export type DateRange = '7d' | '30d' | '90d' | 'all';

function getDateFilter(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
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
  leadsChange: number;
}

export async function getKPIMetrics(range: DateRange): Promise<KPIMetrics> {
  const dateFilter = getDateFilter(range);

  // Total leads
  const leadsResult = dateFilter
    ? await rawQuery<{ count: string }>(
        'SELECT COUNT(*)::text as count FROM leads WHERE converted_at >= $1',
        [dateFilter]
      )
    : await rawQuery<{ count: string }>('SELECT COUNT(*)::text as count FROM leads');
  const totalLeads = parseInt(leadsResult[0]?.count ?? '0', 10);

  // Total visitors
  const visitorsResult = dateFilter
    ? await rawQuery<{ count: string }>(
        'SELECT COUNT(DISTINCT id)::text as count FROM visitors WHERE first_seen_at >= $1',
        [dateFilter]
      )
    : await rawQuery<{ count: string }>('SELECT COUNT(DISTINCT id)::text as count FROM visitors');
  const totalVisitors = parseInt(visitorsResult[0]?.count ?? '0', 10);

  // Conversion rate
  const conversionRate = totalVisitors > 0 ? (totalLeads / totalVisitors) * 100 : 0;

  // Top channel
  const topChannelResult = dateFilter
    ? await rawQuery<{ source: string; count: string }>(
        `SELECT a.utm_source as source, COUNT(*)::text as count
         FROM leads l
         INNER JOIN attributions a ON l.visitor_id = a.visitor_id
         WHERE a.utm_source IS NOT NULL AND l.converted_at >= $1
         GROUP BY a.utm_source
         ORDER BY COUNT(*) DESC
         LIMIT 1`,
        [dateFilter]
      )
    : await rawQuery<{ source: string; count: string }>(
        `SELECT a.utm_source as source, COUNT(*)::text as count
         FROM leads l
         INNER JOIN attributions a ON l.visitor_id = a.visitor_id
         WHERE a.utm_source IS NOT NULL
         GROUP BY a.utm_source
         ORDER BY COUNT(*) DESC
         LIMIT 1`
      );

  const topChannel = topChannelResult[0]?.source
    ? { source: topChannelResult[0].source, count: parseInt(topChannelResult[0].count, 10) }
    : null;

  // Period change
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
  const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);

  const currentResult = await rawQuery<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM leads WHERE converted_at >= $1',
    [currentStart]
  );
  const current = parseInt(currentResult[0]?.count ?? '0', 10);

  const previousResult = await rawQuery<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM leads WHERE converted_at >= $1 AND converted_at < $2',
    [previousStart, currentStart]
  );
  const previous = parseInt(previousResult[0]?.count ?? '0', 10);

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

  // Get leads with first attribution (using DISTINCT ON to avoid duplicates)
  const dataResult = dateFilter
    ? await rawQuery<{
        id: string;
        email: string;
        name: string | null;
        company: string | null;
        converted_at: Date;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        referrer: string | null;
        landing_page: string | null;
      }>(
        `SELECT DISTINCT ON (l.id)
           l.id, l.email, l.name, l.company, l.converted_at,
           a.utm_source, a.utm_medium, a.utm_campaign, a.referrer, a.landing_page
         FROM leads l
         LEFT JOIN attributions a ON l.visitor_id = a.visitor_id
         WHERE l.converted_at >= $1
         ORDER BY l.id, a.captured_at DESC
         LIMIT $2 OFFSET $3`,
        [dateFilter, limit, offset]
      )
    : await rawQuery<{
        id: string;
        email: string;
        name: string | null;
        company: string | null;
        converted_at: Date;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        referrer: string | null;
        landing_page: string | null;
      }>(
        `SELECT DISTINCT ON (l.id)
           l.id, l.email, l.name, l.company, l.converted_at,
           a.utm_source, a.utm_medium, a.utm_campaign, a.referrer, a.landing_page
         FROM leads l
         LEFT JOIN attributions a ON l.visitor_id = a.visitor_id
         ORDER BY l.id, a.captured_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

  const data: DashboardLead[] = dataResult.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    company: row.company,
    convertedAt: row.converted_at,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    referrer: row.referrer,
    landingPage: row.landing_page,
  }));

  // Get total count
  const totalResult = dateFilter
    ? await rawQuery<{ count: string }>(
        'SELECT COUNT(*)::text as count FROM leads WHERE converted_at >= $1',
        [dateFilter]
      )
    : await rawQuery<{ count: string }>('SELECT COUNT(*)::text as count FROM leads');

  return {
    data,
    total: parseInt(totalResult[0]?.count ?? '0', 10),
  };
}

// ============================================================================
// CHANNEL PERFORMANCE QUERY
// ============================================================================

export interface ChannelPerformance {
  source: string;
  leadCount: number;
  percentage: number;
}

export async function getChannelPerformance(range: DateRange): Promise<ChannelPerformance[]> {
  const dateFilter = getDateFilter(range);

  const channelResult = dateFilter
    ? await rawQuery<{ source: string; lead_count: string }>(
        `SELECT COALESCE(a.utm_source, 'Direct') as source, COUNT(DISTINCT l.id)::text as lead_count
         FROM leads l
         LEFT JOIN attributions a ON l.visitor_id = a.visitor_id
         WHERE l.converted_at >= $1
         GROUP BY COALESCE(a.utm_source, 'Direct')
         ORDER BY COUNT(DISTINCT l.id) DESC`,
        [dateFilter]
      )
    : await rawQuery<{ source: string; lead_count: string }>(
        `SELECT COALESCE(a.utm_source, 'Direct') as source, COUNT(DISTINCT l.id)::text as lead_count
         FROM leads l
         LEFT JOIN attributions a ON l.visitor_id = a.visitor_id
         GROUP BY COALESCE(a.utm_source, 'Direct')
         ORDER BY COUNT(DISTINCT l.id) DESC`
      );

  const total = channelResult.reduce((sum, ch) => sum + parseInt(ch.lead_count, 10), 0);

  return channelResult.map((channel) => ({
    source: channel.source,
    leadCount: parseInt(channel.lead_count, 10),
    percentage: total > 0 ? Math.round((parseInt(channel.lead_count, 10) / total) * 100) : 0,
  }));
}

// ============================================================================
// LEADS OVER TIME
// ============================================================================

export interface LeadTrend {
  date: string;
  count: number;
}

export async function getLeadTrend(range: DateRange): Promise<LeadTrend[]> {
  const dateFilter = getDateFilter(range);
  const dateFormat = range === '90d' ? 'YYYY-"W"IW' : 'YYYY-MM-DD';

  const trendResult = dateFilter
    ? await rawQuery<{ date: string; count: string }>(
        `SELECT TO_CHAR(converted_at, '${dateFormat}') as date, COUNT(*)::text as count
         FROM leads
         WHERE converted_at >= $1
         GROUP BY TO_CHAR(converted_at, '${dateFormat}')
         ORDER BY TO_CHAR(converted_at, '${dateFormat}')`,
        [dateFilter]
      )
    : await rawQuery<{ date: string; count: string }>(
        `SELECT TO_CHAR(converted_at, '${dateFormat}') as date, COUNT(*)::text as count
         FROM leads
         GROUP BY TO_CHAR(converted_at, '${dateFormat}')
         ORDER BY TO_CHAR(converted_at, '${dateFormat}')`
      );

  return trendResult.map((row) => ({
    date: row.date,
    count: parseInt(row.count, 10),
  }));
}
