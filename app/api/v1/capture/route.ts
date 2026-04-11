/**
 * Lead Capture API Endpoint
 * POST /api/v1/capture
 *
 * Captures lead data with full attribution tracking.
 * Optionally triggers intelligence processing (enrichment + scoring).
 */

import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import {
  LeadCaptureService,
  LeadCaptureValidationError,
} from '@/lib/application/services';
import { unitOfWork } from '@/lib/infrastructure/repositories';
import { processSingleLead } from '@/lib/application/workers';

const ATTRIBUTION_COOKIE = 'hepta_attribution';

interface CaptureRequestBody {
  visitorUuid: string;
  email: string;
  name?: string;
  company?: string;
  metadata?: Record<string, unknown>;
  processImmediately?: boolean; // Trigger intelligence processing right away
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await parseRequestBody(request);
    if (!body) {
      return errorResponse('Invalid JSON body', 400);
    }

    // Extract IP address from request
    const ipAddress = extractIpAddress(request);

    // Get attribution from HTTP-only cookie
    const cookieStore = await cookies();
    const attributionCookie = cookieStore.get(ATTRIBUTION_COOKIE);

    // Initialize service
    const service = new LeadCaptureService(unitOfWork);

    // Parse attribution if present
    const attribution = attributionCookie
      ? service.parseAttributionCookie(attributionCookie.value)
      : undefined;

    // Capture lead
    const result = await service.capture({
      visitorUuid: body.visitorUuid,
      email: body.email,
      name: body.name,
      company: body.company,
      ipAddress,
      metadata: body.metadata,
      attribution: attribution ?? undefined,
    });

    // Optionally trigger intelligence processing immediately
    let intelligenceResult = null;
    if (body.processImmediately !== false) {
      // Default to processing immediately
      try {
        const processed = await processSingleLead(result.lead.id, ipAddress);
        if (processed.success) {
          intelligenceResult = {
            score: processed.result?.newScore,
            enriched: processed.result?.enrichment?.success ?? false,
            signalTriggered: processed.result?.signalTriggered ?? false,
          };
        }
      } catch (error) {
        // Don't fail the capture if intelligence processing fails
        console.error('Intelligence processing error:', error);
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          leadId: result.lead.id,
          isNewVisitor: result.isNewVisitor,
          hasAttribution: result.attribution !== null,
          intelligence: intelligenceResult,
        },
      },
      { status: 201 }
    );

    return response;
  } catch (error) {
    return handleError(error);
  }
}

function extractIpAddress(request: NextRequest): string | undefined {
  // Try various headers used by proxies/CDNs
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP if there are multiple
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Vercel-specific header
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  return undefined;
}

async function parseRequestBody(
  request: NextRequest
): Promise<CaptureRequestBody | null> {
  try {
    const body = (await request.json()) as unknown;

    if (!isValidRequestBody(body)) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
}

function isValidRequestBody(body: unknown): body is CaptureRequestBody {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const obj = body as Record<string, unknown>;

  return (
    typeof obj.visitorUuid === 'string' &&
    typeof obj.email === 'string' &&
    (obj.name === undefined || typeof obj.name === 'string') &&
    (obj.company === undefined || typeof obj.company === 'string') &&
    (obj.metadata === undefined ||
      (typeof obj.metadata === 'object' && obj.metadata !== null)) &&
    (obj.processImmediately === undefined ||
      typeof obj.processImmediately === 'boolean')
  );
}

function handleError(error: unknown): NextResponse {
  if (error instanceof LeadCaptureValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: error.errors,
      },
      { status: 400 }
    );
  }

  console.error('Lead capture error:', error);

  return errorResponse('Internal server error', 500);
}

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}
