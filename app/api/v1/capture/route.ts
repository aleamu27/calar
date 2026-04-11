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
import { apiKeyService } from '@/lib/application/services/api-key.service';
import { runWithTenant } from '@/lib/core/context/tenant.context';

const ATTRIBUTION_COOKIE = 'hepta_attribution';

interface CaptureRequestBody {
  visitorUuid: string;
  email: string;
  name?: string;
  company?: string;
  metadata?: Record<string, unknown>;
  attribution?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    referrer?: string;
    landingPage?: string;
  };
  processImmediately?: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate API key
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return errorResponse('API key required', 401);
    }

    const validation = await apiKeyService.validateKey(apiKey);

    if (!validation.valid || !validation.tenant) {
      return errorResponse(validation.error || 'Invalid API key', 401);
    }

    // Run the capture within tenant context
    return runWithTenant(validation.tenant, async () => {
      // Parse request body
      const body = await parseRequestBody(request);
      if (!body) {
        return errorResponse('Invalid JSON body', 400);
      }

      // Extract IP address from request
      const ipAddress = extractIpAddress(request);

      // Get attribution from cookie or request body
      const cookieStore = await cookies();
      const attributionCookie = cookieStore.get(ATTRIBUTION_COOKIE);

      // Initialize service
      const service = new LeadCaptureService(unitOfWork);

      // Use attribution from body first, then cookie
      const attribution = body.attribution || (attributionCookie
        ? service.parseAttributionCookie(attributionCookie.value)
        : undefined);

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
          console.error('Intelligence processing error:', error);
        }
      }

      return NextResponse.json(
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
    });
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
