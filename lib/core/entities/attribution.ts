/**
 * Attribution Entity
 * Captures marketing attribution data (UTM parameters, referrer, landing page).
 * Each attribution record is tied to a visitor session.
 */

export interface Attribution {
  id: string;
  visitorId: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPage: string | null;
  capturedAt: Date;
  createdAt: Date;
}

export interface CreateAttributionInput {
  visitorId: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
}

/**
 * Raw attribution data as captured from cookies/request.
 * Used for parsing and validation before persistence.
 */
export interface RawAttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  captured_at?: string;
}
