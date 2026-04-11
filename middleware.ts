/**
 * Attribution Collector Middleware
 * Edge-light middleware that captures UTM parameters and referrer data.
 *
 * Flow:
 * 1. Check for UTM parameters in the URL
 * 2. Capture referrer and landing page
 * 3. Store in secure HTTP-only cookie (30-day expiry)
 *
 * The cookie is read by LeadCaptureService when a conversion occurs.
 */

import { NextResponse, type NextRequest } from 'next/server';

const ATTRIBUTION_COOKIE = 'hepta_attribution';
const VISITOR_COOKIE = 'hepta_visitor';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  captured_at: string;
}

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const { searchParams } = request.nextUrl;

  // Check if we have any UTM parameters
  const hasUtmParams = UTM_PARAMS.some((param) => searchParams.has(param));

  // Get referrer (filter out same-site referrers)
  const referrer = getReferrer(request);

  // Only process if we have UTM params or an external referrer
  if (!hasUtmParams && !referrer) {
    // Ensure visitor cookie exists even without attribution
    ensureVisitorCookie(request, response);
    return response;
  }

  // Build attribution data
  const attribution: AttributionData = {
    captured_at: new Date().toISOString(),
    landing_page: request.nextUrl.pathname + request.nextUrl.search,
  };

  // Capture UTM parameters
  for (const param of UTM_PARAMS) {
    const value = searchParams.get(param);
    if (value) {
      attribution[param] = sanitizeParam(value);
    }
  }

  // Capture referrer
  if (referrer) {
    attribution.referrer = referrer;
  }

  // Decide whether to overwrite existing attribution
  // Strategy: First-touch attribution (only set if no existing cookie)
  const existingAttribution = request.cookies.get(ATTRIBUTION_COOKIE);

  if (!existingAttribution) {
    setAttributionCookie(response, attribution);
  }

  // Ensure visitor cookie exists
  ensureVisitorCookie(request, response);

  return response;
}

/**
 * Extracts referrer, filtering out same-site traffic.
 */
function getReferrer(request: NextRequest): string | null {
  const referrer = request.headers.get('referer');
  if (!referrer) return null;

  try {
    const referrerUrl = new URL(referrer);
    const currentHost = request.nextUrl.host;

    // Filter out same-site referrers
    if (referrerUrl.host === currentHost) {
      return null;
    }

    return referrerUrl.origin + referrerUrl.pathname;
  } catch {
    return null;
  }
}

/**
 * Sanitizes UTM parameter values.
 * Prevents injection and limits length.
 */
function sanitizeParam(value: string): string {
  return value
    .trim()
    .slice(0, 255)
    .replace(/[<>"']/g, '');
}

/**
 * Sets the attribution cookie with secure defaults.
 */
function setAttributionCookie(
  response: NextResponse,
  attribution: AttributionData
): void {
  const cookieValue = encodeURIComponent(JSON.stringify(attribution));

  response.cookies.set(ATTRIBUTION_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Ensures visitor has a persistent UUID cookie.
 * This links anonymous sessions to eventual lead conversions.
 */
function ensureVisitorCookie(
  request: NextRequest,
  response: NextResponse
): void {
  const existingVisitor = request.cookies.get(VISITOR_COOKIE);

  if (!existingVisitor) {
    const visitorUuid = crypto.randomUUID();

    response.cookies.set(VISITOR_COOKIE, visitorUuid, {
      httpOnly: false, // Client-side JS needs to read this for form submissions
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }
}

/**
 * Matcher configuration.
 * Runs on all routes except static files and API routes.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
