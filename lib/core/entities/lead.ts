/**
 * Lead Entity
 * Represents a converted visitor who has provided contact information.
 * Links back to the visitor record for full attribution tracking.
 */

export interface Lead {
  id: string;
  visitorId: string;
  email: string;
  name: string | null;
  company: string | null;
  enrichedCompany: string | null;
  score: number;
  scoreBreakdown: ScoreBreakdownData | null;
  enrichedAt: Date | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  convertedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadInput {
  visitorId: string;
  email: string;
  name?: string | null;
  company?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ScoreBreakdownData {
  pageViews: number;
  highValuePages: number;
  repeatedVisits: number;
  businessEmail: number;
  enrichment: number;
  total: number;
  calculatedAt: string;
}

/**
 * Lead with full attribution chain for analytics queries.
 */
export interface LeadWithAttribution extends Lead {
  visitor: {
    visitorUuid: string;
    firstSeenAt: Date;
  };
  attributions: Array<{
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    capturedAt: Date;
  }>;
}
