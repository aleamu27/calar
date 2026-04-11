/**
 * API Key Middleware
 * Validates API keys and establishes tenant context for requests.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { apiKeyService } from '../services/api-key.service';
import { runWithTenant } from '../../core/context/tenant.context';

const API_KEY_HEADER = 'x-api-key';
const AUTHORIZATION_HEADER = 'authorization';

export interface ApiKeyMiddlewareResult {
  authorized: boolean;
  tenantId: string | null;
  scopes: string[];
  error?: string;
}

/**
 * Extracts API key from request headers.
 * Supports both x-api-key header and Bearer token.
 */
export function extractApiKey(request: NextRequest): string | null {
  // Try x-api-key header first
  const apiKeyHeader = request.headers.get(API_KEY_HEADER);
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Try Authorization: Bearer header
  const authHeader = request.headers.get(AUTHORIZATION_HEADER);
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Validates API key and returns tenant information.
 */
export async function validateApiKey(
  request: NextRequest
): Promise<ApiKeyMiddlewareResult> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return {
      authorized: false,
      tenantId: null,
      scopes: [],
      error: 'API key required. Provide via x-api-key header or Authorization: Bearer token.',
    };
  }

  const result = await apiKeyService.validateKey(apiKey);

  if (!result.valid) {
    return {
      authorized: false,
      tenantId: null,
      scopes: [],
      error: result.error ?? 'Invalid API key',
    };
  }

  return {
    authorized: true,
    tenantId: result.tenant!.id,
    scopes: result.scopes,
  };
}

/**
 * Creates an unauthorized response.
 */
export function unauthorizedResponse(error: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized',
      message: error,
    },
    { status: 401 }
  );
}

/**
 * Higher-order function to wrap an API handler with API key validation.
 * Automatically establishes tenant context for the request.
 */
export function withApiKeyAuth<T>(
  handler: (request: NextRequest, tenantId: string) => Promise<T>
): (request: NextRequest) => Promise<T | NextResponse> {
  return async (request: NextRequest) => {
    const apiKey = extractApiKey(request);

    if (!apiKey) {
      return unauthorizedResponse(
        'API key required. Provide via x-api-key header or Authorization: Bearer token.'
      );
    }

    const validation = await apiKeyService.validateKey(apiKey);

    if (!validation.valid || !validation.tenant) {
      return unauthorizedResponse(validation.error ?? 'Invalid API key');
    }

    // Run handler within tenant context
    return runWithTenant(validation.tenant, () =>
      handler(request, validation.tenant!.id)
    );
  };
}

/**
 * Checks if request has required scope.
 */
export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes('*') || scopes.includes(required);
}

/**
 * Higher-order function to require specific scope.
 */
export function withScope<T>(
  scope: string,
  handler: (request: NextRequest, tenantId: string, scopes: string[]) => Promise<T>
): (request: NextRequest) => Promise<T | NextResponse> {
  return async (request: NextRequest) => {
    const apiKey = extractApiKey(request);

    if (!apiKey) {
      return unauthorizedResponse('API key required');
    }

    const validation = await apiKeyService.validateKey(apiKey);

    if (!validation.valid || !validation.tenant) {
      return unauthorizedResponse(validation.error ?? 'Invalid API key');
    }

    if (!hasScope(validation.scopes, scope)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: `Required scope: ${scope}`,
        },
        { status: 403 }
      );
    }

    return runWithTenant(validation.tenant, () =>
      handler(request, validation.tenant!.id, validation.scopes)
    );
  };
}
